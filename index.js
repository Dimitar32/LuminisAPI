import express from "express";
import fetch from "node-fetch";
import pool from "./db.js"; // Import the database connection
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET;

app.use(express.json());
app.use(cors());

// Email transporter for 2FA
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com", // Outlook SMTP server
  port: 587,
  secure: false, // Must be false for Outlook (TLS)
  auth: {
      user: process.env.EMAIL_USER, // Your Outlook email
      pass: process.env.EMAIL_PASS, // Use an App Password (See Step 2)
  },
  tls: {
      ciphers: "SSLv3",
  },
});

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
 * ✅ Login without 2FA
 */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
      const user = await pool.query("SELECT * FROM users WHERE username = $1", [username]);

      if (user.rows.length === 0) {
          return res.status(401).json({ success: false, message: "Invalid username or password" });
      }

      const validPassword = await bcrypt.compare(password, user.rows[0].password);

      if (!validPassword) {
          return res.status(401).json({ success: false, message: "Invalid username or password" });
      }

      // Generate JWT Token
      const token = jwt.sign({ id: user.rows[0].id, username: user.rows[0].username }, SECRET_KEY, {
          expiresIn: "2h",
      });

      res.json({ success: true, token, message: "Login successful" });
  } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});



/**
 * ✅ Middleware to Protect Routes
 */
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
      const decoded = jwt.verify(token, SECRET_KEY);
      req.user = decoded;
      next();
  } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

/**
* ✅ Get Orders (Protected Route)
*/
app.get("/api/orders", verifyToken, async (req, res) => {
  try {
      const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
      res.json({ success: true, orders: result.rows });
  } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch orders" });
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
 * ✅ Update Order Status (Protected Route)
 */
app.put("/api/orders/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        // Check if order exists
        const order = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
        if (order.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Update order status
        await pool.query("UPDATE orders SET status = $1 WHERE id = $2", [status, id]);

        res.json({ success: true, message: "Order status updated successfully" });
    } catch (error) {
        console.error("❌ Error updating order status:", error);
        res.status(500).json({ success: false, message: "Failed to update order status" });
    }
});


/**
 * ✅ Delete Order (Protected Route)
 */
app.delete("/api/orders/:id", verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Check if the order exists
        const existingOrder = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
        if (existingOrder.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Delete the order
        await pool.query("DELETE FROM orders WHERE id = $1", [id]);

        res.json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting order:", error);
        res.status(500).json({ success: false, message: "Failed to delete order" });
    }
});

/**
 * ✅ Get Product Quantities (Protected Route)
 */
app.get("/api/products-quantity", verifyToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT id, brand, productname, quantity FROM products ORDER BY id ASC");
        res.json({ success: true, products: result.rows });
    } catch (error) {
        console.error("❌ Error fetching product quantities:", error);
        res.status(500).json({ success: false, message: "Failed to fetch product quantities" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
