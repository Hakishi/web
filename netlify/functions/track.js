const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPA_URL,
  process.env.SUPA_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const reqHeaders = event.headers;
    const body = JSON.parse(event.body || "{}");

    // Get IP address
    const ip = reqHeaders['x-nf-client-connection-ip'] 
            || reqHeaders['x-forwarded-for']?.split(',')[0].trim()
            || reqHeaders['client-ip'] 
            || 'Unknown';

    // Get location data from free IP API
    let city = 'Unknown';
    let country = 'Unknown';
    let region = 'Unknown';
    let latLon = '0, 0';
    let isp = 'Unknown';
    let timezone = 'Unknown';

    if (ip !== 'Unknown') {
      try {
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
        const geoData = await geoResponse.json();
        
        if (!geoData.error) {
          city = geoData.city || 'Unknown';
          country = geoData.country_name || 'Unknown';
          region = geoData.region || 'Unknown';
          latLon = `${geoData.latitude || 0}, ${geoData.longitude || 0}`;
          isp = geoData.org || 'Unknown';
          timezone = geoData.timezone || 'Unknown';
        }
      } catch (geoErr) {
        console.log("Geo API error:", geoErr);
      }
    }

    const visitorData = {
      session_id: body.sessionId,
      ip: ip,
      city: city,
      country: country,
      region: region,
      lat_lon: latLon,
      device: reqHeaders['user-agent'] || 'Unknown',
      screen_res: body.screenRes || 'Unknown',
      language: body.language || 'Unknown',
      page_url: body.pageUrl || 'Unknown',
      referrer: body.referrer || 'Direct',
      time_spent: body.timeSpent || 0
    };

    console.log("Saving visitor:", visitorData);

    const { error } = await supabase
      .from('visitors')
      .upsert([visitorData], { onConflict: 'session_id' });

    if (error) {
      console.log("Supabase error:", error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ message: "Logged", city, country }) };
  } catch (err) {
    console.log("Error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};