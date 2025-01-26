import fetch from 'node-fetch';

export const getEcontOffices = async (req, res) => {
  try {
    // Econt API Endpoint
    const econtUrl = 'https://ee.econt.com/services/Nomenclatures/NomenclaturesService.getOffices.json';

    // Fetch Offices Data
    const response = await fetch(econtUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: { countryCode: 'BGR' } }), // Filter for Bulgarian offices
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data?.offices) {
      const bulgarianOffices = data.offices.filter(
        office => office.address?.city?.country?.code2 === 'BG' // Ensure offices are in Bulgaria
      );

      return res.json({ success: true, offices: bulgarianOffices });
    } else {
      return res.status(404).json({ success: false, message: 'No offices found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
