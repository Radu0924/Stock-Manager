from datetime import date, timedelta
from algoritmi import (
    Transaction, DestinationCandidate,
    compute_metrics, compute_surplus,
    score_destinations, verify_ROI,
    greedy_allocation, check_stockout,
)

passed = 0
failed = 0

def test(name, condition):
    global passed, failed
    if condition:
        print(f"  + {name}")
        passed += 1
    else:
        print(f"  x {name}")
        failed += 1

def generate_transactions(daily_quantity: int, days: int = 30) -> list[Transaction]:
    today = date.today()
    return [
        Transaction(date=today - timedelta(days=i), quantity=daily_quantity)
        for i in range(days)
    ]

print("\n[ compute_metrics ]")

fast_transactions = generate_transactions(10)
slow_transactions = generate_transactions(1)
all_speeds = [10.0, 10.0, 10.0, 1.0]

fast_metrics = compute_metrics("M1", fast_transactions, current_stock=100, all_speeds=all_speeds)
slow_metrics = compute_metrics("M4", slow_transactions, current_stock=100, all_speeds=all_speeds)

test("high-sales store classified as Fast", fast_metrics.classification == "Fast")
test("low-sales store classified as Slow", slow_metrics.classification == "Slow")
test("DoS computed correctly for fast store", fast_metrics.DoS < 20)
test("daily speed is positive", fast_metrics.daily_speed > 0)
test("empty transactions return speed 0",
     compute_metrics("M0", [], 50, [0.0]).daily_speed == 0.0)

print("\n[ compute_surplus ]")

surplus = compute_surplus(current_stock=150, daily_speed=5.0)
test("surplus correctly computed (150 stock, speed 5)", surplus == 60)

surplus_zero = compute_surplus(current_stock=50, daily_speed=5.0)
test("no surplus when stock is below optimal", surplus_zero == 0)

surplus_exact = compute_surplus(current_stock=90, daily_speed=5.0)
test("surplus 0 when stock equals optimal", surplus_exact == 0)

print("\n[ score_destinations ]")

candidates = [
    DestinationCandidate("A", DoS=3.0,  route_cost=50.0,  free_capacity=100),
    DestinationCandidate("B", DoS=10.0, route_cost=20.0,  free_capacity=50),
    DestinationCandidate("C", DoS=7.0,  route_cost=100.0, free_capacity=200),
]
result = score_destinations(candidates)

test("returns all candidates", len(result) == 3)
test("first has highest score", result[0].score >= result[1].score)
test("second has score >= third", result[1].score >= result[2].score)
test("candidate with low DoS is prioritized", result[0].store_id == "A")
test("scores are between 0 and 1", all(0.0 <= c.score <= 1.0 for c in result))
test("empty list returns empty list", score_destinations([]) == [])

print("\n[ verify_ROI ]")

test("sufficient ROI -> valid transfer", verify_ROI(quantity=20, unit_price=50.0, route_cost=100.0))
test("insufficient ROI -> invalid transfer", not verify_ROI(quantity=2, unit_price=10.0, route_cost=200.0))
test("route cost 0 -> invalid (avoid division by zero)", not verify_ROI(10, 50.0, 0.0))

print("\n[ greedy_allocation ]")

sources = [
    {"store_id": "S1", "available_surplus": 80},
    {"store_id": "S2", "available_surplus": 30},
]
allocation_destinations = [
    DestinationCandidate("D1", DoS=2.0, route_cost=30.0, free_capacity=50, score=0.9),
    DestinationCandidate("D2", DoS=5.0, route_cost=80.0, free_capacity=40, score=0.6),
]
allocation_result = greedy_allocation(sources, allocation_destinations, unit_price=100.0)

test("generates at least one order", len(allocation_result.orders) > 0)
test("transferred quantity does not exceed source surplus",
     all(o.quantity <= 80 for o in allocation_result.orders if o.source_id == "S1"))
test("orders have valid type (automatic or manager_approval)",
     all(o.type in ("automatic", "manager_approval") for o in allocation_result.orders))
test("remaining surplus is non-negative",
     all(v >= 0 for v in allocation_result.remaining_surplus.values()))

empty_result = greedy_allocation(
    [{"store_id": "S0", "available_surplus": 0}],
    allocation_destinations,
    unit_price=100.0
)
test("surplus 0 -> no orders generated", len(empty_result.orders) == 0)

print("\n[ check_stockout ]")

test("DoS 3 < threshold 5 -> alert", check_stockout("M1", DoS=3.0))
test("DoS 5 = threshold 5 -> no alert", not check_stockout("M1", DoS=5.0))
test("DoS 10 > threshold 5 -> no alert", not check_stockout("M1", DoS=10.0))

print(f"\n{'='*40}")
print(f"  Result: {passed} passed, {failed} failed")
print(f"{'='*40}\n")
