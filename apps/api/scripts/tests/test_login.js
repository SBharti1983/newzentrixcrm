import axios from 'axios';
async function test() {
    try {
        const res = await axios.post('http://localhost:5050/api/auth/login', {
            email: 'arjun@zentrix.com',
            password: 'Admin@123'
        });
        console.log(res.data);
    } catch(e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
test();
