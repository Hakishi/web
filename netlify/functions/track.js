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

    const visitorData = {
      session_id: body.sessionId,
      ip: reqHeaders['x-nf-client-connection-ip'] || 'Unknown',
      city: reqHeaders['x-nf-geo-city'] || 'Unknown',
      country: reqHeaders['x-nf-geo-country'] || 'Unknown',
      region: reqHeaders['x-nf-geo-region-name'] || 'Unknown',
      lat_lon: `${reqHeaders['x-nf-geo-latitude'] || '0'}, ${reqHeaders['x-nf-geo-longitude'] || '0'}`,
      device: reqHeaders['user-agent'] || 'Unknown',
      screen_res: body.screenRes || 'Unknown',
      language: body.language || 'Unknown',
      page_url: body.pageUrl || 'Unknown',
      referrer: body.referrer || 'Direct',
      time_spent: body.timeSpent || 0
    };

    const { error } = await supabase
      .from('visitors')
      .upsert([visitorData], { onConflict: 'session_id' });

    if (error) {
      console.log("Supabase error:", error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ message: "Logged" }) };
  } catch (err) {
    console.log("Error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};