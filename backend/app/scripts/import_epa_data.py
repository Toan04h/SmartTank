import csv 
import uuid
from sqlmodel import Session, delete
from app.core.database import engine
from app.models.vehicle_catalog import VehicleCatalog

CSV_PATH = "epa_vehicles.csv"

def parse_float(value: str) -> float | None:
    """Conver string to float, return None if 0 or empty."""
    try: 
        result = float(value)
        return result if result != 0.0 else None
    except (ValueError, TypeError):
        return None
    
def parse_int(value: str) -> int | None:
    """convert string to int, return None if 0 or empty."""
    try: 
        result = int(value)
        return result if result != 0 else None
    except (ValueError, TypeError):
        return None
    
def import_epa_data():
    with Session(engine) as session:
        session.exec(delete(VehicleCatalog))
        session.commit()
    print("Cleared existing vehicle catalog...")
    
    print("Starting EPA data import...")
    count = 0 
    skipped = 0
    
    with open(CSV_PATH, mode='r', newline='') as f:
        reader = csv.DictReader(f)
        batch = []
        
        with Session(engine) as session:
        
            for row in reader:
                if not row.get('id'):
                    skipped+=1
                    continue
                
                description = " | ".join(
                    filter(None, [row.get('eng_dscr'), row.get('trany')])
                ) or None
                
                vehicle_entry = VehicleCatalog(
                    epa_vehicle_id=row['id'],
                    make=row['make'],
                    model=row['model'],
                    year=int(row['year']),
                    description=description,
                    drive=row['drive'] or None,
                    cylinders=parse_int(row.get('cylinders', '')),
                    displacement=parse_float(row.get('displ', '')),
                    vehicle_class=row.get('VClass') or None,
                    atv_type=row.get('atvType') or None,
                    fuel_type=row.get('fuelType1') or None,
                    city_mpg=parse_float(row.get('city08', '')),
                    highway_mpg=parse_float(row.get('highway08', '')),
                    combined_mpg=parse_float(row.get('comb08', '')),
                    fuel_type_2=row.get('fuelType2') or None,
                    city_mpg_alt=parse_float(row.get('cityA08', '')),
                    highway_mpg_alt=parse_float(row.get('highwayA08', '')),
                    combined_mpg_alt=parse_float(row.get('combA08', ''))
                )
                batch.append(vehicle_entry)
                count+=1
                
                if len(batch) == 500:
                    session.add_all(batch)
                    session.commit()
                    session.expunge_all()
                    batch = []
                    print(f"Imported {count} vehicles...")
            
            if batch: 
                session.add_all(batch)
                session.commit()
    print(f"Import complete - {count} vehicles imported {skipped} skipped")
                
if __name__ == "__main__":
    import_epa_data()