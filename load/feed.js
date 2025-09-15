import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'], // ms
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE}/api/feed`);
  if (res.status !== 200) {
    // mark failure but continue
  }
  sleep(1);
}

