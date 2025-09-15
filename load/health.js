import http from 'k6/http';

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  http.get(`${BASE}/api/health`);
}

