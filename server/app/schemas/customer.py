from pydantic import BaseModel, EmailStr, Field, ConfigDict


class CustomerBase(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    phone: str = Field(..., min_length=7)


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
