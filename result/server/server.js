const express = require('express');
const { Client } = require('pg');

const client = new Client({
    user: "postgres",
    host: "localhost",
    database: "postgres",
    password: "postgres",
    port: "5432"
})

const app = express();
client.connect();
console.log("connect success!!!")


// curl "http://localhost:3000/"
app.get('/', async (req, res) => {
    try {
        res.json("Hi");
    } catch (error){
        console.error(error);
        res.status(500).send('Error loading page');
    }
});

// curl "http://localhost:3000/available-shifts/3?start='2023-02-07T05:00:00.660Z'&end='2023-02-12T10:00:00.660Z'"
app.get('/available-shifts/:workerId', async (req, res) => {
    const { workerId } = req.params;
    const { start, end } = req.query;

    try {
        const query = `
        SELECT s.id, s.start, s.end, s.is_deleted, s.profession, f.id as facility_id, f.name as facility_name 
        FROM "Shift" s 
        INNER JOIN "Facility" f ON s.facility_id = f.id 
        WHERE 
            f.is_active = true 
        AND s.is_deleted = false
        AND s.worker_id IS NULL 
        AND s.start BETWEEN ${start} AND ${end}
        AND s.profession = (
            SELECT profession FROM "Worker" WHERE id = ${workerId} AND is_active = true
        )
        AND EXISTS (
            SELECT 1
            FROM "Facility" f1
            JOIN "FacilityRequirement" fr ON f1.id = fr.facility_id
            JOIN "DocumentWorker" dw ON fr.document_id = dw.document_id
            WHERE dw.worker_id = ${workerId}
            AND f1.is_active = true
            AND fr.facility_id = s.facility_id
            AND NOT EXISTS (
                SELECT 1
                FROM "FacilityRequirement" fr2
                WHERE fr2.facility_id = fr.facility_id
                AND fr2.document_id NOT IN (
                    SELECT document_id
                    FROM "DocumentWorker" dw2
                    WHERE dw2.worker_id = ${workerId}
                )
            )
        )`;

        const result = await client.query(query);
        console.log(result);

        const shiftsByDate = {};
            result.rows.forEach(row => {
            const date = row.start.toDateString();
            shiftsByDate[date] = shiftsByDate[date] || [];
            shiftsByDate[date].push(row);
        });

        res.json(shiftsByDate);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching available shifts');
    }
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});