/* eslint-disable no-await-in-loop */
import moment from 'moment';
import { Quickbook, QuickbookWebhooks, QuickbookClass } from '../db';

const urlencode = require('urlencode');
const crypto = require('crypto');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const auth = require('../tools/auth');

const router = express.Router();

router.get('/', auth.required, async (req, res) => {
  res.json(await QuickbookWebhooks.findAll());
});

router.get('/refresh', auth.required, async (req, res) => {
  res.status(200).send();
});

router.post('/', bodyParser.json(), async (req, res) => {
  console.log(`Body: ${JSON.stringify(req.body)}`);
  console.log(`Headers: ${JSON.stringify(req.headers)}`);

  try {
    const webhookPayload = JSON.stringify(req.body);

    const signature = req.get('intuit-signature');

    // if signature is empty return 401
    if (!signature) {
      throw new Error('error');
    }

    // if payload is empty, don't do anything
    if (!webhookPayload) {
      throw new Error('error');
    }

    /**
     * Validates the payload with the intuit-signature hash
     */
    const hash = crypto.createHmac('sha256', 'cb642a53-4a28-4f58-855e-aa1e31bc07a6').update(webhookPayload).digest('base64');
    if (signature === hash) {
      await QuickbookWebhooks.create({
        data: JSON.stringify(req.body.eventNotifications),
      });
      return res.status(200).send('SUCCESS');
    }
    return res.status(401).send('FORBIDDEN');
  } catch (s) {
    const newUpdate = await QuickbookWebhooks.create({
      data: JSON.stringify(req.body),
    });
  }
});

module.exports = router;
