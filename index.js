  const express = require('express');
  const cors = require('cors');
  const jwt= require('jsonwebtoken');
  const cookieParser=require('cookie-parser');
  const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

  const port=process.env.PORT || 5000;
  const app=express();


  

  // middileware
  app.use(cors({
    origin: [
      'https://cars-doctor-client-47560.web.app',
      'https://cars-doctor-client-47560.firebaseapp.com'
    ],
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  require('dotenv').config();


  const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.meaty0s.mongodb.net/?retryWrites=true&w=majority`;

  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

    // created middlewire
  const logger=async(req,res,next)=>{
    console.log('called:',req.host, req.method, req.url,);
    next();
  }
  const verifytoken=async(req,res,next)=>{
    const token=req?.cookies?.token;
    console.log('value of token in middlewire',token);
    if(!token){
      return res.status(401).send({message:'not athurized'})
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(error,decoded)=>{
      // error
      if(error){
        console.log(error);
        return res.status(401).send({message:'unauthorized access'});
      }
      console.log('value in token :', decoded);
      // if token is valid it would be decoded
      req.user=decoded;
      next();
    })
  } 
  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      client.connect();

      const serviceCollection=client.db('CarDoctor').collection('services');
      const bookingCollection=client.db('CarDoctor').collection('bookings');
      
      // auth related api
      app.post('/jwt',logger, async(req,res)=>{
        const user=req.body;
        console.log(user);      
        const token=jwt.sign(user, process.env.ACCESS_TOKEN_SECRET , {expiresIn : '1h'});
        res
        .cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        })
        .send({success: true});
      })
      app.post('/logout',async(req,res)=>{
        const user=req.body;
        console.log('log out',user);
        res.clearCookie('token',{maxAge:0}).send({success:true})
      })
      // services related api.
      // service
      app.get('/services',logger,async(req,res)=>{
          const cursor =serviceCollection.find();
          const result=await cursor.toArray();
          res.send(result);
      })
      app.get('/services/:id',async(req,res)=>{
          const id=req.params.id;
          const query={_id: new ObjectId(id)};
          const options = {           
            
              projection: { title: 1, service_id: 1, price: 1,img:1 },
            };
          const result= await serviceCollection.findOne(query,options);
          res.send(result);
      })

      // booking 
      app.post('/bookings',logger, async(req,res)=>{
        const booking=req.body;
        const result=await bookingCollection.insertOne(booking);
        res.send(result);
      })
      app.get('/bookings',logger, verifytoken, async(req,res)=>{
        console.log(req.query.email);
        console.log('user in the valid token',req.user);
        console.log('bookings cookies',req.cookies);
        if(req.query.email !==req.user.email){
          return res.status(403).send({message: 'forbidden access'});
        }
        // console.log('token',req.cookies.token)
        let query={};
        if(req.query?.email){
          query={email: req.query.email};
        }
        const result=await bookingCollection.find(query).toArray();
        res.send(result);
      })
      app.delete('/bookings/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id: new ObjectId(id)};
        const result=await bookingCollection.deleteOne(query);
        res.send(result);
      })
      app.patch('/bookings/:id',async(req,res)=>{
        const updatedBooking=req.body;
        const id=req.params.id;
        const query={_id: new ObjectId(id)};
        const updateDoc = {
          $set: {
            status: updatedBooking.status
          }
        };
        const result=await bookingCollection.updateOne(query,updateDoc);
        res.send(result);
    

      })
      

      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
    }
  }
  run().catch(console.dir);



  app.get('/', (req,res)=>{
      res.send('doctor is running');
  })
  app.listen(port,()=>{
      console.log(`car doctor server is running on server port ${port}`);
  })
