# Weather Forecast Helper Function
def is_number(n):
    if type(n) in [int, float]:
        return n
    else:        
        return {f'Error: Expected a number, got {type(n).__name__} instead.'}

__name__ = "is_number"   