#!/usr/bin/env python3
"""Convierte la base SQLite de Gadgetbridge a nuestro JSON de dias (esquema mi-band).

Gadgetbridge (app Android libre) guarda los datos de la Mi Band 5 en una base SQLite
llamada "Gadgetbridge". Desde la app: Menu > Rutinas y dispositivos > [tu pulsera] >
Bases de datos / "Database management" > "Export DB". Eso crea un archivo(s) en la
carpeta de Gadgetbridge (normalmente Android/data/nodomain.freeyourgadget.gadgetbridge/files/).

Uso:
    python miband_export_to_json.py Gadgetbridge -o mi-band-import.json

Salida: un JSON con un objeto {"days": [...]} (o un array) que la web importa desde
la pestana "Importar datos" del dashboard.

Tablas usadas (esquema verificable via .schema):
  MI_BAND_ACTIVITY_SAMPLE
    - TIMESTAMP      unix epoch en segundos (una fila por minuto)
    - DEVICE_ID / USER_ID
    - STEPS          pasos del minuto
    - RAW_KIND       tipo de actividad: 80=activo, 96=sueño, 112=profundo, 117=ligero
    - HEART_RATE     bpm del minuto (255 o 0 = medicion invalida)
"""
import argparse
import datetime as dt
import json
import sqlite3
import sys
from collections import defaultdict

# RAW_KIND de la Mi Band en Gadgetbridge
KIND_ACTIVE = 80
KIND_SLEEP = 96        # sueño medio / sin clasificar
KIND_DEEP = 112
KIND_LIGHT = 117

# Extremo 90 dias (+ algo) de maximo por defecto (la web guarda hasta 180 registros).
DEFAULT_MAX_DAYS = 200


def ggb_date(ts: int) -> str:
    """Convierte epoch en fecha local YYYY-MM-DD."""
    # Gadgetbridge almacena la marca en hora local del telefono (no UTC).
    return dt.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")


def aggregate(rows, max_days):
    """agrega las filas por dia local."""
    days = defaultdict(lambda: {
        "steps": 0, "hr": [], "hr_rest": [], "deep": 0, "light": 0,
        "active_min": 0, "first": None, "last": None,
    })
    for ts, device, user, steps, hr, kind in rows:
        d = ggb_date(ts)
        day = days[d]
        day["steps"] += steps
        if steps > 0:
            day["active_min"] += 1
        day["first"] = min(day["first"] if day["first"] is not None else ts, ts)
        day["last"] = max(day["last"] if day["last"] is not None else ts, ts)
        # frecuencia cardiaca valida 2..254
        if hr and 2 <= hr <= 254:
            day["hr"].append(hr)
        if 2 <= hr <= 254:
            # reposo: minimo mientras se duerme
            if kind in (KIND_SLEEP, KIND_DEEP, KIND_LIGHT):
                day["hr_rest"].append(hr)
        if kind == KIND_DEEP:
            day["deep"] += 60
        elif kind in (KIND_LIGHT, KIND_SLEEP):
            day["light"] += 60
    result = []
    for d in sorted(days):
        rec = days[d]
        steps = rec["steps"]
        hrs = rec["hr"]
        hr_rest = rec["hr_rest"]
        avg_hr = int(round(sum(hrs) / len(hrs))) if hrs else None
        resting = min(hr_rest) if hr_rest else None
        deep_min = rec["deep"]
        light_min = rec["light"]
        # Deriva el camino en km (paso_metro tipico 0.74 m) i que la app usa 1350 pasos/km
        distance_km = round(steps / 1350, 2) if steps else 0.0
        active_min = rec["active_min"]
        result.append({
            "date": d,
            "steps": steps,
            "distanceKm": distance_km,
            "calories": round(steps * 0.04) if steps else 0,
            "activeMinutes": active_min,
            "heartRate": {
                "avg": avg_hr if avg_hr is not None else 0,
                "resting": resting if resting is not None else 0,
                "min": min(hrs) if hrs else 0,
                "max": max(hrs) if hrs else 0,
            },
            "spo2": None,
            "stress": None,
            "pai": 0,
            "energy": None,
            "sleep": {
                "deepMin": int(round(deep_min / 60)),
                "lightMin": int(round(light_min / 60)),
                "remMin": 0,   # la Mi Band 5 no separa REM en el raw de Gadgetbridge
                "awakeMin": 0,
            },
            "workouts": [],
            "lastSyncAt": None,
        })
    return result[-max_days:] if max_days else result


def main():
    ap = argparse.ArgumentParser(description="Convierte la BD Gadgetbelt a JSON de dias")
    ap.add_argument("db", help="Ruta al archivo de base de datos (normalmente 'Gadgetbridge')")
    ap.add_argument("-o", "--out", default="mi-band-import.json", help="Ruta de salida JSON")
    ap.add_argument("--max-days", type=int, default=DEFAULT_MAX_DAYS, help="Limite de dias (por defecto 90)")
    args = ap.parse_args()

    conn = sqlite3.connect(f"file:{args.db}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row

    cols = [r[1] for r in conn.execute("PRAGMA table_info(MI_BAND_ACTIVITY_SAMPLE)")]
    required = {"TIMESTAMP", "STEPS", "RAW_KIND"}
    missing = required - set(cols)
    if missing:
        sys.exit(f"La tabla MI_BAND_ACTIVITY_SAMPLE no tiene columnas esperadas: {sorted(missing)}. "
                 f"Columnas encontradas: {cols}")

    rows = conn.execute(
        "SELECT TIMESTAMP, DEVICE_ID, USER_ID, STEPS, HEART_RATE, RAW_KIND "
        "FROM MI_BAND_ACTIVITY_SAMPLE WHERE STEPS IS NOT NULL ORDER BY TIMESTAMP"
    )

    days = aggregate((
        (r["TIMESTAMP"], r["DEVICE_ID"], r["USER_ID"], r["STEPS"] or 0,
         r["HEART_RATE"] or 255, r["RAW_KIND"] or KIND_ACTIVE) for r in rows
    ), args.max_days)

    conn.close()

    if not days:
        sys.exit("No se encontraron dias en la BD.")

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(days, f, ensure_ascii=False, separators=(",", ":"))

    first = days[0]["date"]
    last = days[-1]["date"]
    total_steps = sum(d["steps"] for d in days)
    print(f"OK: {len(days)} dias ({first} .. {last}), {total_steps:,} pasos totales.")
    print(f"Archivo creado: {args.out}")
    print("Ahora subelo en el dashboard: panel 'Mi Band 5' > pestana 'Importar datos'.")


if __name__ == "__main__":
    main()