from database import engine
from sqlalchemy import text

new_columns = {
    "months": "REAL",
    "milk_kg": "REAL",
    "dim": "REAL",
    "lact": "REAL",
    "lying": "REAL",
    "air_temperature": "REAL",
    "thi1": "REAL",
    "hli": "REAL",
    "relative_humidity": "REAL",
    "solar_radiation": "REAL",
    "wind_speed": "REAL",
}

with engine.begin() as conn:

    result = conn.execute(
        text("PRAGMA table_info(health_records)")
    )

    existing_columns = {row[1] for row in result}

    for column, data_type in new_columns.items():

        if column not in existing_columns:
            conn.execute(
                text(
                    f"ALTER TABLE health_records "
                    f"ADD COLUMN {column} {data_type}"
                )
            )
            print(f"Added column: {column}")
        else:
            print(f"Already exists: {column}")

print("\nHealth database migration completed successfully.")