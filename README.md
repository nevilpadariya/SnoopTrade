# Project Name: SnoopTrade

### Project Description
This project investigates the relationship between insider trading activity and stock price movements. By analyzing insider trading data (e.g., Form 4 filings from the SEC EDGAR database) alongside historical stock price data, the project aims to identify patterns and correlations that can help retail investors better understand how insider trades may influence stock performance. The ultimate goal is to develop a prototype system that visualizes these trends and offers insights into potential stock price impacts based on insider trading activity.
More infomation for the project is mentiond in Class project-insider trades.docx

## About the Team

### Team Members:

1. Pratikkumar Dalsukhbhai Korat
3. Nevil Padariya
3. Nagaraj Gireppa Kanni

---

## Project Technologies Stack:
* Backend -> Python, FastAPI
* Database -> MongoDB
* Frontend -> React, Material UI
* Deployment -> AWS/GCP

---
## Architecture and Deployment Diagram:
![Architecture_Diagram](https://github.com/user-attachments/assets/4e6a256d-462b-4e9f-b740-024510630635)


---
## Backend API Documentation

This document provides a brief overview of the backend API endpoints.

### Authentication

* **POST /auth/signup:** Create a new user account.
* **POST /auth/token:**  Log in and obtain an access token.
* **GET /auth/me:** Fetch current user's information (requires authentication).
* **PUT /auth/me/update:** Update user profile (requires authentication).

### SecEdgar

* **GET /transactions/{ticker}/{transaction_id}:** Fetch a specific insider trading transaction.
* **GET /transactions/{ticker}:** Retrieve all transactions for a given ticker.

### Stocks

* **GET /stocks/{ticker}:**  Retrieve historical and current stock data.

### Forecasts

* **POST /future:** Generate stock price forecasts based on input data.

### Default

* **GET /**:  Welcome message.
### Authentication

Most endpoints require authentication with a valid access token in the `Authorization` header:

We have used the Swagger UI for API documentation and testing. The Swagger UI can be accessed at the following URL:

[http://cmpe272teamsnooptrade.us-west-2.elasticbeanstalk.com/docs](http://cmpe272teamsnooptrade.us-west-2.elasticbeanstalk.com/docs)

---

## Frontend Overview

This frontend provides a user-friendly interface for visualizing insider trading patterns and stock trends.

### Features

* **Dashboard:** Interactive graphs and tables for stock-insider trade insights.
* **Authentication:** Google OAuth and email/password login.
* **About:** Project overview and team information.
* **Account:** User profile and settings.

### Tech Stack

* React
* Material UI
* Axios
* Chart.js

### Integration

* Communicates with the backend via REST APIs.
* Deployed on AWS/GCP for scalability.

### Link to the website

[http://cmpe272frontend.us-west-2.elasticbeanstalk.com/dashboard](http://cmpe272frontend.us-west-2.elasticbeanstalk.com)

---

## User Persona Summary Document
[View User Persona Summary](https://docs.google.com/document/d/1M36ZfJ77DTIMX9P-NQI2_S8Kb-T7aSXh_dai-61QxJ4/edit)

## Product Backlog
[View Product Backlog ](https://docs.google.com/spreadsheets/d/1-6SNRWafSqVvoitA6lYNFqx0OGWtVJPsw2Rxw7qgCcU/edit?usp=sharing) 

## Project Sprint Task Board
[https://docs.google.com/spreadsheets/d/1uJr3OGZMIMjZN1VK0RzqEzCFX1NDH_OOJ3BB7nGJSpk/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1uJr3OGZMIMjZN1VK0RzqEzCFX1NDH_OOJ3BB7nGJSpk/edit?usp=sharing)
