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

    const ip = reqHeaders['x-nf-client-connection-ip'] 
            || reqHeaders['x-forwarded-for']?.split(',')[0].trim()
            || 'Unknown';

    console.log("=== NEW REQUEST ===");
    console.log("Detected IP:", ip);

    let city = 'Unknown';
    let country = 'Unknown';
    let region = 'Unknown';
    let latLon = '0, 0';

    if (ip !== 'Unknown') {
      try {
        const geoResponse = await fetch(`https://ipwho.is/${ip}`);
        const geoData = await geoResponse.json();
        
        console.log("Geo API response:", JSON.stringify(geoData));

        if (geoData.success) {
          city = geoData.city || 'Unknown';
          country = geoData.country || 'Unknown';
          region = geoData.region || 'Unknown';
          latLon = `${geoData.latitude || 0}, ${geoData.longitude || 0}`;
        }
      } catch (geoErr) {
        console.log("Geo API error:", geoErr.message);
      }
    }

    // Get current time in Indian Standard Time (IST)
    const istTime = new Date().toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

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
      time_spent: body.timeSpent || 0,
      visit_time_ist: istTime
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
    console.log("Error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};