const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
require('dotenv').config();
const port = process.env.PORT || 5000


//stripe payment-method secret key
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


// middle ware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('this is royal auto parts')
})

app.listen(port, () => {
    console.log(`app listening on port ${port}`)
})





const uri = `${process.env.DB_URI}`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//--------------------------------------------------------------------------------


// verify jwt 

function verifyJWT(req, res, next) {
    // console.log('abc')
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: ' sorry Un-Authorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {

        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded
        next()
    });
}

//-----------------------------------------------------------------








async function run() {

    try {
        await client.connect();
        console.log('connected royal autoparts')

        const partsCollection = client.db('royal_autoparts').collection('parts')
        const orderCollection = client.db('royal_autoparts').collection('orders')
        const paymentCollection = client.db('royal_autoparts').collection('payment')
        const reviewCollection = client.db('royal_autoparts').collection('reviews')
        const profileCollection = client.db('royal_autoparts').collection('profile')
        const userCollection = client.db('royal_autoparts').collection('user')
        const manageOrderCollection = client.db('royal_autoparts').collection('manageOrder')
        //---------------------------------------------------------------------------------
        //for my portfolio
        const worksCollection = client.db('royal_autoparts').collection('works')
        //----------------------------------------------------------------------




        // getting all orders

        // app.get('/orders', async (req, res) => {
        //     const query = {};
        //     const cursor = await orderCollection.find(query).toArray()

        //     res.send(cursor);
        // })

        app.get('/parts', async (req, res) => {
            const query = {};
            const cursor = await partsCollection.find(query).toArray()

            res.send(cursor);
        })


        // getting all parts 

        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const parts = await partsCollection.findOne(query);
            res.send(parts)
        })

        app.get('/orders', async (req, res) => {
            const cursor = await orderCollection.find({}).toArray();
            res.send(cursor);
        })



        // getting all orders according to individual email address 
        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.userEmail;
            console.log(email)
            const decodedEmail = req.decoded.email
            if (email === decodedEmail) {
                const query = { userEmail: email }
                const cursor = orderCollection.find(query)
                const myOrders = await cursor.toArray()
                return res.send(myOrders);

            } else {
                return res.status(403).send({ message: 'forbidden access' })
            }

        })

        app.post('/orders', async (req, res) => {

            const orders = req.body;
            const result = await orderCollection.insertOne(orders);
            res.send(result)
        })





        // get user via id
        app.get('/orders/:id', async (req, res) => {

            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const orders = await orderCollection.findOne(query);
            res.send(orders);
        })


        // for payment....
        app.post('/create-payment-intent', async (req, res) => {
            const orders = req.body;
            const price = orders.pricePerUnit;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        })



        app.patch('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                    status: 'panding',
                }
            }

            const updateOrder = await orderCollection.updateOne(filter, updatedDoc);
            const result = await paymentCollection.insertOne(payment)
            res.send(updatedDoc);
        })


        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);

        })

        // review part
        app.post('/reviews', async (req, res) => {

            const orders = req.body;
            const result = await reviewCollection.insertOne(orders);
            res.send(result)
        })


        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = await reviewCollection.find(query).toArray()

            res.send(cursor);
        })


        // users profile API
        app.post('/profile', async (req, res) => {

            const profile = req.body;
            const result = await profileCollection.insertOne(profile);
            res.send(result)
        })


        app.get('/profile', async (req, res) => {
            const query = {};
            const cursor = await profileCollection.find(query).toArray()

            res.send(cursor);
        })


        app.get('/profile', async (req, res) => {

            const email = req.query.email
            const query = { email: email }
            const cursor = profileCollection.find(query)
            const profile = await cursor.toArray()
            res.send(profile)
        })


        app.put('/profile/:id', async (req, res) => {
            const id = req.params.id;
            const updateProfileData = req.body
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {

                    education: updateProfileData.education,
                    location: updateProfileData.location,
                    linkdin: updateProfileData.linkdin,
                }
            };

            const result = await profileCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })


        // getting all users from data base.

        app.get('/user', async (req, res) => {
            const query = {};
            const cursor = await userCollection.find(query).toArray()

            res.send(cursor);
        })




        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            }

            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });

        })



        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const requester = req.decoded.email;
            const requsterAccount = await userCollection.findOne({ email: requester })

            if (requsterAccount.role === 'admin') {

                const updateDoc = {
                    $set: { role: 'admin' }
                }
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);

            } else {
                res.status(403).send({ message: 'forbidden' })
            }

        })


        // checking the person admin or not
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })


        // adding-products by admin
        app.post('/parts', async (req, res) => {

            const parts = req.body;
            const result = await partsCollection.insertOne(parts);
            res.send(result)
        })




        //updatin status by admin: 

        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const updatedStatus = req.body
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {

                    status: updatedStatus.status,

                }
            };

            const result = await orderCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })


        // manage all parts


        app.put('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const updatePrdocucteData = req.body
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {

                    name: updatePrdocucteData.name,
                    img: updatePrdocucteData.img,
                    description: updatePrdocucteData.description,
                    minOrderQuantity: updatePrdocucteData.minOrderQuantity,
                    availableQuantity: updatePrdocucteData.availableQuantity,
                    pricePerUnit: updatePrdocucteData.pricePerUnit

                }
            };

            const result = await partsCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        //------------------------------------------------------------------------
        //for portfolio project

        app.get('/works', async (req, res) => {
            const query = {};
            const cursor = await worksCollection.find(query).toArray()

            res.send(cursor);
        })


        app.get('/works/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const works = await worksCollection.findOne(query);
            res.send(works)
        })
    }
    finally {

    }
}

run().catch(console.dir)

