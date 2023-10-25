const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lfoj6uk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).json({ error: true, message: "Unauthorized access" });
  }

  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: true, message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("instituteDB");
    const usersCollection = database.collection("users");
    const noticesCollection = database.collection("notices");
    const applicationsCollection = database.collection("applications");
    const resultsCollection = database.collection("results");

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ error: true, message: "forbidden message" });
      }
      next();
    };

    // jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "24h" });
      res.send({ token });
    });

    // Get an user by user id
    app.get("/getUserById/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersCollection.findOne(filter);
      res.send(result);
    });

    // Get current login user by email
    app.get("/getUserByEmail/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // Get all users
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get only all admins
    app.get("/getAllAdmins", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: "admin" };
      const admins = usersCollection.find(query);
      const result = await admins.toArray();
      res.send(result);
    });

    // Get only all teachers
    app.get("/getAllTeachers", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: "teacher" };
      const teachers = usersCollection.find(query);
      const result = await teachers.toArray();
      res.send(result);
    });

    // Get all students
    app.get("/getAllStudents", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: "student" };
      const students = await usersCollection.find(query).toArray();
      // console.log(students);
      res.send(students);
    });

    // Get admin user
    app.get("/getAdminUser/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    // Get teacher user
    app.get("/getTeacherUser/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { teacher: user?.role === "teacher" };
      res.send(result);
    });

    // Get student user
    app.get("/getStudentUser/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { student: user?.role === "student" };
      res.send(result);
    });

    // Get a notice
    app.get("/getNoticeById/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await noticesCollection.findOne(filter);
      res.send(result);
    });

    // Get all notices
    app.get("/getAllNotices", async (req, res) => {
      const cursor = noticesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get only all applications
    app.get("/getAllApplication", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await applicationsCollection.find().toArray();
      res.send(result);
    });

    // Get only all applications
    app.get("/getApplicationById/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await applicationsCollection.findOne(filter);
      res.send(result);
    });

    // Get only all results
    app.get("/getAllResults", async (req, res) => {
      const result = await resultsCollection.find().toArray();
      res.send(result);
    });

    // Define a route to get results based on roll, class, and passingYear
    // app.get("/getAllResults", async (req, res) => {
    //   const { roll, class: studentClass, passingYear } = req.body;

    //   if (!roll || !studentClass || !passingYear) {
    //     return res.send.status(404).json({ error: "Information is invalid" });
    //   }

    //   const student = await resultsCollection.findOne({
    //     roll: parseInt(roll),
    //     studentClass: parseInt(studentClass),
    //     passingYear: parseInt(passingYear),
    //   });

    //   if (!student) {
    //     return res.send.status(404).json({ error: "Information is invalid" });
    //   }

    //   res.json(student);
    // });

    // Update student user data
    app.patch("/userUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateUser = req.body;
      // console.log(updateUser);
      const updateDoc = {
        $set: {
          ...updateUser,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Make admin from teacher
    app.patch("/makeAdmin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Remove admin as teacher
    app.patch("/removeAdmin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "teacher",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Update a notice
    app.patch("/noticeUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateNotice = req.body;
      const updateDoc = {
        $set: {
          ...updateNotice,
        },
      };
      const result = await noticesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/applicationStatusUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result = await applicationsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete any user
    app.delete("/deleteUser/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Delete any user
    app.delete("/deleteApplication/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await applicationsCollection.deleteOne(query);
      res.send(result);
    });

    // Delete a notice
    app.delete("/deleteNotice/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await noticesCollection.deleteOne(query);
      res.send(result);
    });

    // Post and user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Post a notice
    app.post("/postNotices", async (req, res) => {
      const notice = req.body;
      const result = await noticesCollection.insertOne(notice);
      res.send(result);
    });

    // Post a application
    app.post("/postApplication", async (req, res) => {
      const notice = req.body;
      const result = await applicationsCollection.insertOne(notice);
      res.send(result);
    });

    // Post a result
    app.post("/postResult", async (req, res) => {
      const notice = req.body;
      const result = await resultsCollection.insertOne(notice);
      res.send(result);
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

app.get("/", (req, res) => {
  res.send("Al-Azam school and college server is running successfully!");
});

app.listen(port, () => {
  console.log(`Al-Azam school and college server is runnig on PORT: ${port}`);
});
