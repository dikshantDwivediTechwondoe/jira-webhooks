// Require the necessary modules
const express = require("express");
const axios = require("axios");
require("dotenv").config();

// Create an instance of the express app
const app = express();

app.use(express.json());

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/audit-records", async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://dikshant-dwivedi.atlassian.net/rest/api/3/auditing/record",
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.JIRA_EMAIL}:${process.env.JIRA_BASIC_AUTH_TOKEN}`
          ).toString("base64")}`,
        },
      }
    );
    res.send(data);
  } catch (err) {
    if (err?.response?.data) {
      console.log(err.response.data);
      return res.send(err.response.data);
    }
    console.log(err);
    res.send(err);
  }
});

app.get("/event", async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://dikshant-dwivedi.atlassian.net/rest/api/3/events",
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.JIRA_EMAIL}:${process.env.JIRA_BASIC_AUTH_TOKEN}`
          ).toString("base64")}`,
        },
      }
    );
    res.send(data);
  } catch (err) {
    if (err?.response?.data) {
      console.log(err.response.data);
      return res.send(err.response.data);
    }
    console.log(err);
    res.send(err);
  }
});

//Just to make a point, basic auth won't work for webhook APIs
/*app.get("/webhooks", async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.atlassian.com/ex/jira/0236219b-8c35-4aa2-8b80-fcfd35f28a5d/rest/api/3/webhook",
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.JIRA_EMAIL}:${process.env.JIRA_BASIC_AUTH_TOKEN}`
          ).toString("base64")}`,
        },
      }
    );
    res.send(data);
  } catch (err) {
    if (err?.response?.data) {
      console.log(err.response.data);
      return res.send(err.response.data);
    }
    console.log(err);
    res.send(err);
  }
});*/

app.get("/auth", async (req, res) => {
  try {
    res.redirect(
      `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${process.env.JIRA_CLIENT}&scope=manage%3Ajira-webhook%20write%3Ajira-work%20manage%3Ajira-configuration%20read%3Ajira-work%20manage%3Ajira-project%20read%3Ajira-user%20manage%3Ajira-data-provider&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth-callback&state=\${YOUR_USER_BOUND_VALUE}&response_type=code&prompt=consent`
    );
  } catch (err) {
    if (err?.response?.data) {
      console.log(err.response.data);
      return res.send(err.response.data);
    }
    console.log(err);
    res.send(err);
  }
});

const cache = {};

app.get("/oauth-callback", async (req, res) => {
  try {
    const { data } = await axios.post(
      "https://auth.atlassian.com/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: process.env.JIRA_CLIENT,
        client_secret: process.env.JIRA_SECRET,
        code: req.query.code,
        redirect_uri: "http://localhost:3000/oauth-callback",
      }
    );
    cache.access_token = data.access_token;
    cache.expires_in = data.expires_in;
    cache.created_at = Date.now();
    res.send("You are now authenticated.");
  } catch (err) {
    if (err?.response?.data) {
      console.log(err.response.data);
      return res.send(err.response.data);
    }
    console.log(err);
    res.send(err);
  }
});

const getToken = (req, res, next) => {
  function isTokenExpired(token) {
    const expirationTime = token.created_at + token.expires_in * 1000;
    return Date.now() >= expirationTime;
  }
  if (cache.access_token && !isTokenExpired(cache.access_token)) {
    return next();
  }
  return res.send("Token is expired. You need to be authenticated");
};

app.get("/resources", getToken, async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: {
          Authorization: `Bearer ${cache.access_token}`,
        },
      }
    );
    res.send(data);
  } catch (err) {
    if (err?.response?.data) {
      console.log(err.response.data);
      return res.send(err.response.data);
    }
    console.log(err);
    res.send(err);
  }
});

app.get("/projects", getToken, async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.atlassian.com/ex/jira/0236219b-8c35-4aa2-8b80-fcfd35f28a5d/rest/api/3/project/search",
      {
        headers: {
          Authorization: `Bearer ${cache.access_token}`,
        },
      }
    );
    res.send(data);
  } catch (err) {
    if (err?.response?.data) {
      console.log(err.response.data);
      return res.send(err.response.data);
    }
    console.log(err);
    res.send(err);
  }
});

app.get("/webhooks", getToken, async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.atlassian.com/ex/jira/0236219b-8c35-4aa2-8b80-fcfd35f28a5d/rest/api/3/webhook",
      {
        headers: {
          Authorization: `Bearer ${cache.access_token}`,
        },
      }
    );
    res.send(data);
  } catch (err) {
    if (err?.response?.data) {
      console.log(err.response.data);
      return res.send(err.response.data);
    }
    console.log(err);
    res.send(err);
  }
});

app.post("/webhooks", getToken, async (req, res) => {
  try {
    const bodyData = {
      url: "https://3cc8-2401-4900-1c5a-d1a2-a189-8a62-a4f2-5050.in.ngrok.io/webhook-received",
      webhooks: [
        {
          events: [
            "jira:issue_created",
            "jira:issue_updated",
            "jira:issue_deleted",
            "comment_created",
            "comment_updated",
            "comment_deleted",
            "issue_property_set",
            "issue_property_deleted",
          ],
          jqlFilter: "project = SP",
        },
      ],
    };

    const { data } = await axios.post(
      "https://api.atlassian.com/ex/jira/0236219b-8c35-4aa2-8b80-fcfd35f28a5d/rest/api/3/webhook",
      bodyData,
      {
        headers: {
          Authorization: `Bearer ${cache.access_token}`,
        },
      }
    );

    res.send(data);
  } catch (err) {
    if (err?.response?.data) {
      console.log(err.response.data);
      return res.send(err.response.data);
    }
    console.log(err);
    res.send(err);
  }
});

app.delete("/webhooks", getToken, async (req, res) => {
  try {
    const { data } = await axios.delete(
      "https://api.atlassian.com/ex/jira/0236219b-8c35-4aa2-8b80-fcfd35f28a5d/rest/api/3/webhook",
      {
        headers: {
          Authorization: `Bearer ${cache.access_token}`,
        },
        data: req.body,
      }
    );

    res.send(data);
  } catch (err) {
    if (err?.response?.data) {
      console.log(err.response.data);
      return res.send(err.response.data);
    }
    console.log(err);
    res.send(err);
  }
});

app.post("/webhook-descriptor", (req, res) => {
  console.log(req.body);
});

app.post("/webhook-received", (req, res) => {
  console.log(req.body);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
