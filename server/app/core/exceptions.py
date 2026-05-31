class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class ProductNotFoundException(AppException):
    def __init__(self, product_id: int):
        super().__init__(
            message=f"Product with id {product_id} not found",
            status_code=404,
        )
 
class CustomerNotFoundException(AppException):
    def __init__(self, customer_id: int):
        super().__init__(
            message=f"Customer with id {customer_id} not found",
            status_code=404,
        )
  
class OrderNotFoundException(AppException):
    def __init__(self, order_id: int):
        super().__init__(
            message=f"Order with id {order_id} not found",
            status_code=404,
        )
class DuplicateSKUException(AppException):
    def __init__(self, sku: str):
        super().__init__(
            message=f"Product with SKU '{sku}' already exists",
            status_code=400,
        )
 
class DuplicateEmailException(AppException):
    def __init__(self, email: str):
        super().__init__(
            message=f"Customer with email '{email}' already exists",
            status_code=400,
        )
 
class InsufficientStockException(AppException):
    def __init__(self, product_name: str, requested: int, available: int):
        super().__init__(
            message=(
                f"Insufficient stock for '{product_name}'. "
                f"Requested: {requested}, Available: {available}"
            ),
            status_code=400,
        )
 
class NegativeQuantityException(AppException):
    def __init__(self):
        super().__init__(
            message="Quantity cannot be negative",
            status_code=400,
        )

class EmptyOrderException(AppException):
    def __init__(self):
        super().__init__(
            message="Order must contain at least one item",
            status_code=400,
        )
  
class OrderCancellationException(AppException):
    def __init__(self, order_id: int, status: str):
        super().__init__(
            message=(
                f"Order {order_id} cannot be cancelled "
                f"because its status is '{status}'"
            ),
            status_code=400,
        )
