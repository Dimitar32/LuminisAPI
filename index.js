import express from "express";
import fetch from "node-fetch";
import pool from "./db.js"; // Import the database connection
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET;

app.use(express.json());
app.use(cors());

/**
 * ✅ Fetch Econt Offices
 */
app.post("/api/get-offices", async (req, res) => {
    try {
        const response = await fetch(
            "https://ee.econt.com/services/Nomenclatures/NomenclaturesService.getOffices.json",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filter: { countryCode: "BGR" } })
            }
        );

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();

        if (data?.offices) {
            const bulgarianOffices = data.offices.filter(office => 
                office.address?.city?.country?.code2 === "BG"
            );

            return res.json({ success: true, offices: bulgarianOffices });
        } else {
            return res.status(404).json({ success: false, message: "No offices found" });
        }
    } catch (error) {
        console.error("❌ Error fetching Econt offices:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

/**
 * ✅ Save Order
 */
app.post("/api/save-order", async (req, res) => {
  try {
    const { firstName, lastName, phone, address, city, note, orderItems } = req.body;

    if (!firstName || !lastName || !phone || !orderItems.length) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const result = await pool.query(
      `INSERT INTO orders (first_name, last_name, phone, address, city, note, order_items, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [firstName, lastName, phone, address, city, note, JSON.stringify(orderItems)]
    );

    res.status(201).json({ success: true, order: result.rows[0] });
  } catch (error) {
    console.error("❌ Error saving order:", error);
    res.status(500).json({ success: false, message: "Failed to save order" });
  }
});

/**
 * ✅ Get Orders
 */
app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    res.json({ success: true, orders: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
