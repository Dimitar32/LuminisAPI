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
app.use('/images', express.static('public/images'));

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

        await pool.query("BEGIN");

        // Deduct stock and check availability
        for (const item of orderItems) {

            const updateStock = await pool.query(
                `UPDATE products 
                 SET quantity = quantity - $1 ,
                     updateDate = NOW()
                 WHERE id = $2 AND quantity >= $1 
                 RETURNING quantity`,
                [item.quantity, item.id]
            );

            if (updateStock.rows.length === 0) {
                await pool.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: `Няма достатъчно наличност от ${item.name}.`,
                });
            }
        }

        // FIX: Use proper JSON storage
        const result = await pool.query(
            `INSERT INTO orders (first_name, last_name, phone, address, city, note, order_items, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, CAST($7 AS JSONB), NOW()) RETURNING *`,
            [firstName, lastName, phone, address, city, note, JSON.stringify(orderItems)]
        );

        // FIX: Ensure the transaction is committed
        await pool.query("COMMIT");

        res.status(201).json({ success: true, order: result.rows[0] });
    } catch (error) {
        await pool.query("ROLLBACK");
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
        res.status(500).json({ success: false, message: "Failed to update order status" });
    }
});


/**
 * ✅ Delete Order (Protected Route)
 */
// app.delete("/api/orders/:id", verifyToken, async (req, res) => {
//     const { id } = req.params;

//     try {
//         // Check if the order exists
//         const existingOrder = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
//         if (existingOrder.rows.length === 0) {
//             return res.status(404).json({ success: false, message: "Order not found" });
//         }

//         // Delete the order
//         await pool.query("DELETE FROM orders WHERE id = $1", [id]);

//         res.json({ success: true, message: "Order deleted successfully" });
//     } catch (error) {
//         res.status(500).json({ success: false, message: "Failed to delete order" });
//     }
// });
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

        const order = existingOrder.rows[0];

        // Check if the order is not shipped
        if (order.status !== "shipped") {
            // Parse the order_items JSON
            const orderItems = JSON.parse(order.order_items);

            // Restock each product
            for (const item of orderItems) {
                await pool.query(
                    `UPDATE products
                     SET quantity = quantity + $1,
                         updateDate = NOW()
                     WHERE id = $2`,
                    [item.quantity, item.id]
                );
            }
        }

        // Delete the order
        await pool.query("DELETE FROM orders WHERE id = $1", [id]);

        res.json({ success: true, message: "Order deleted successfully, and products restocked if applicable" });
    } catch (error) {
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
        res.status(500).json({ success: false, message: "Failed to fetch product quantities" });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const { brand } = req.query; // Extract brand from query parameters

        let query = 'SELECT * FROM products';
        let values = [];

        // If a brand is provided, filter by it
        if (brand) {
            query += ' WHERE brand = $1';
            values.push(brand);
        }

        query += ' ORDER BY id ASC'; 

        const result = await pool.query(query, values);

        // Modify response to include full image URLs
        const products = result.rows.map(product => ({
            ...product,
            imageUrl: `https://luminisapi.onrender.com/images/${product.productname}.png`
        }));

        res.json({ success: true, products });
    } catch (err) {
        res.status(500).json({ message: "Error fetching products", error: err });
    }
});

app.post("/api/send-email", async (req, res) => {
    const { firstName, lastName, phone, address, city, note, orderItems } = req.body;

    try {
        if (!firstName || !lastName || !phone || !orderItems.length) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Format the order details
        const orderDetails = orderItems
            .map(item => `Product: ${item.name}, Quantity: ${item.quantity}, Price: ${item.price.toFixed(2)} BGN`)
            .join("\n");

        // Email content
        const emailContent = `
            New Order Received!\n
            Name: ${firstName} ${lastName}
            Phone: ${phone}
            Address: ${address}, ${city}
            Note: ${note || "None"}
            \nOrder Details:\n${orderDetails}
        `;

        // Configure Nodemailer Transporter
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: process.env.EMAIL_TO, 
            subject: "New Order Received",
            text: emailContent,
        };

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to send email" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
