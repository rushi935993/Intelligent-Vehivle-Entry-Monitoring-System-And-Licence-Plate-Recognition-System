from parking_logic import allocate_slot

print("Testing SQL insert...")
slot, msg = allocate_slot("TEST1234")
print("Result:", slot, msg)
