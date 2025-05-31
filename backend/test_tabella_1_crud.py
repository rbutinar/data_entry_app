import requests

BASE_URL = "http://localhost:8000/debug/test-table-data"
TABLE_NAME = "tabella_1"


def print_response(resp):
    print(f"Status: {resp.status_code}")
    try:
        print("Response:", resp.json())
    except Exception:
        print(resp.text)
    print("-" * 40)


def add_row(data):
    url = f"{BASE_URL}/{TABLE_NAME}"
    resp = requests.post(url, json=data)
    print("Add row:", data)
    print_response(resp)
    return resp.json() if resp.status_code == 200 else None


def get_rows():
    url = f"{BASE_URL}/{TABLE_NAME}"
    resp = requests.get(url)
    print("Get rows:")
    print_response(resp)
    return resp.json().get("data", []) if resp.status_code == 200 else []


def update_row(pk_value, updates, pk_col="id"):
    url = f"{BASE_URL}/{TABLE_NAME}/{pk_value}?pk={pk_col}"
    resp = requests.patch(url, json=updates)
    print(f"Update row where {pk_col}={pk_value}:", updates)
    print_response(resp)


def delete_row(pk_value, pk_col="id"):
    url = f"{BASE_URL}/{TABLE_NAME}/{pk_value}?pk={pk_col}"
    resp = requests.delete(url)
    print(f"Delete row where {pk_col}={pk_value}")
    print_response(resp)


def main():
    # 1. Add rows
    row1 = {"nome": "Alice", "valore": 123}
    row2 = {"nome": "Bob", "valore": 456}
    added1 = add_row(row1)
    added2 = add_row(row2)

    # 2. Get all rows
    rows = get_rows()
    print("Rows after insert:", rows)

    # 3. Update the first row (assume PK is 'id')
    if rows:
        pk_value = rows[0].get("id")
        if pk_value is not None:
            update_row(pk_value, {"nome": "Alice Updated", "valore": 999})

    # 4. Get all rows after update
    rows = get_rows()
    print("Rows after update:", rows)

    # 5. Delete the second row
    if len(rows) > 1:
        pk_value = rows[1].get("id")
        if pk_value is not None:
            delete_row(pk_value)

    # 6. Get all rows after delete
    rows = get_rows()
    print("Rows after delete:", rows)

if __name__ == "__main__":
    main()
