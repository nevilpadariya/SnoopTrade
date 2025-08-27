# app.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from routers.auth_router import auth_router
from routers.sec_router import sec_router
from routers.stock_router import stock_router
from routers.forecast_router import forecast_router
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # Update this to match your frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (e.g., GET, POST, OPTIONS)
    allow_headers=["*"],  # Allow all headers
)
# Include the routers with tags for Swagger organization
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(sec_router, tags=["SecEdgar"])
app.include_router(stock_router, tags=["Stocks"])
app.include_router(forecast_router, tags=["Forecasts"])

@app.get("/")
async def welcome():
    return {"message": "Welcome to the API!"}