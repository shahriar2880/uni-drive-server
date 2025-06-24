
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 3000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pkcxb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const carsCollection = client.db('carDB').collection('cars');
        const bookingCarCollection = client.db('carDB').collection('bookingCars');

        // JWT related API's
        app.get('/jwt', async (req, res) => {
            try {
                const user = req.body;
                const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5hr' })
                res.status(200).send({ token });
            } catch (error) {
                console.error(error.message);
                res.status(400).send({ message: 'Failed to generate JWT' });
            }
        });

        // cars related API
        app.get('/cars', async (req, res) => {
            try {
                const query = carsCollection.find();
                const result = await query.toArray();
                res.status(200).send(result);
            } catch (error) {
                res.status(400).send('Failed to fetch cars');
            }
        });

        app.get('/cars/:id', async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) };
                const result = await carsCollection.findOne(query);
                res.status(200).send(result);
            } catch (error) {
                res.status(400).send('Failed to fetch car details');
            }
        });


        app.get('/my-cars/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const query = { "saveUserDetails.email": email };
                const result = await carsCollection.find(query).toArray();
                res.status(200).send(result);
            } catch (error) {
                res.status(400).send('Failed to fetch my car details');
            }
        });

        app.get('/recent-cars', async (req, res) => {
            try {
                const query = carsCollection.find().sort({ availabilityDate: -1 }).limit(6);
                const result = await query.toArray();
                res.status(200).send(result);
            } catch (error) {
                res.status(400).send('Failed to fetch cars');
            }
        });

        app.post('/cars', async (req, res) => {
            try {
                const newCar = req.body;
                const result = await carsCollection.insertOne(newCar);
                res.status(200).send(result);
            } catch (error) {
                res.status(400).send('Failed to add car');
            }
        });

        app.put('/cars/:id', async (req, res) => {
            const updatedCar = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const car = {
                $set: {
                    carModel: updatedCar.carModel,
                    dailyRentalPrice: updatedCar.dailyRentalPrice,
                    availabilityDate: updatedCar.availabilityDate,
                    vehicleRegistrationNumber: updatedCar.vehicleRegistrationNumber,
                    features: updatedCar.features,
                    description: updatedCar.description,
                    bookingCount: updatedCar.bookingCount,
                    imageUrl: updatedCar.imageUrl,
                    location: updatedCar.location,
                    bookingStatus: updatedCar.bookingStatus,
                },
            };
            try {
                const result = await carsCollection.updateOne(filter, car);
                if (result.matchedCount === 0) {
                    return res.status(404).send('Car not found');
                }
                res.status(200).send(result);
            } catch (error) {
                res.status(400).send('Failed to update car');
            }
        });

        app.delete('/cars/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await carsCollection.deleteOne(query);

                if (result.deletedCount === 0) {
                    return res.status(404).send('Car not found');
                }

                res.status(200).send(result);
            } catch (error) {
                res.status(400).send('Failed to delete car');
            }
        });

        // booking car related API's
        app.get('/booking-cars', async (req, res) => {
            try {
                const query = bookingCarCollection.find();
                const result = await query.toArray();
                res.status(200).send(result);
            } catch (error) {
                res.status(400).send('Failed to fetch booking cars');
            }
        });

        app.get('/booking-cars/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const query = { booked_user: email }; // Use 'booked_user' instead of 'email'
                const result = await bookingCarCollection.find(query).toArray();
                res.status(200).send(result);
            } catch (error) {
                res.status(400).send({ message: 'Failed to fetch booking cars by user email' });
            }
        });

        app.post('/booking-cars', async (req, res) => {
            try {
                const bookingCar = req.body;
                const result = await bookingCarCollection.insertOne(bookingCar);

                if (result.insertedId) {
                    res.status(200).send(result);
                } else {
                    res.status(400).send({ message: 'Failed to add new booking' });
                }
            } catch (error) {
                res.status(500).send('Failed to add booking car');
            }
        });

        app.patch('/booking-cars/:id', async (req, res) => {
            try {
                const id = req.params.id;
                console.log(id);
                const filter = { _id: id };
                const updateBooking = {
                    $set: {
                        bookingStatus: 'Cancel',
                    },
                };
                const result = await bookingCarCollection.updateOne(filter, updateBooking);
                console.log(result);
                if (result.modifiedCount === 1) {
                    res.status(200).send(result);
                } else {
                    res.status(404).send({ message: 'Booking car not found or no changes made' });
                }
            } catch (error) {
                console.error('Error updating booking status:', error);
                res.status(500).send({ message: 'Failed to update booking status' });
            }
        });

        app.delete('/booking-cars/:id', async (req, res) => {
            try {
                const id = req.params.id;

                const query = {_id: id};
                const result = await bookingCarCollection.deleteOne(query);

                if (result.deletedCount > 0) {
                    res.status(200).send(result);
                } else {
                    res.status(400).send({message: 'Booking car not found'});
                }  
            } catch (error) {
                res.status(500).send({message: 'An error occurred while deleting the document', error});
            }
        });
        
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Neo Drive Server');
});

app.listen(port, () => {
    console.log(`Server is connected to port ${port}`);
})
