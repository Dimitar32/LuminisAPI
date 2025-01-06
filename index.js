import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

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
            // ✅ Filter only Bulgarian offices (code2 === "BG")
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

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
