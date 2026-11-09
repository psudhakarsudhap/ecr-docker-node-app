import "dotenv/config";
import express from "express";
import mongoose from "mongoose";

export const app = express();
app.use(express.json());

// Connect to MongoDB
const mongodbUri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
try {
  await mongoose.connect(mongodbUri, { dbName });
  console.log("Connected to MongoDB");
} catch (err) {
  console.error("Error connecting to MongoDB", err);
}
// Schema and Model for Student
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  course: String,
  age: Number,
});
const Student = mongoose.model("Student", studentSchema);

app.get("/", (_req, res) => {
  res.json({ message: "API is running" });
});

//CRUD
//Create a new student
app.post("/api/v1/students", async (req, res) => {
  const { name, email, course, age } = req.body ?? {};
  try {
    if (!name || !email) {
      const newStudent = await Student.create({ name, email, course, age });
      return res
        .status(400)
        .json({ message: "name and email are required", data: newStudent });
    }
    const student = await Student.create({ name, email, course, age });
    res
      .status(201)
      .json({ message: "Student created successfully", data: student });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating student", error: err.message });
  }
});
// Read all students
app.get("/api/v1/students", async (_req, res) => {
  try {
    const students = await Student.find();
    res.json({ message: "Students retrieved successfully", data: students });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error retrieving students", error: err.message });
  }
});
// Read a single student by ID
app.get("/api/v1/students/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ message: "Student retrieved successfully", data: student });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error retrieving student", error: err.message });
  }
});
// Update a student by ID
app.put("/api/v1/students/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, course, age } = req.body ?? {};
  try {
    const student = await Student.findByIdAndUpdate(
      id,
      { name, email, course, age },
      { new: true, runValidators: true },
    );
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ message: "Student updated successfully", data: student });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating student", error: err.message });
  }
});
// Delete a student by ID
app.delete("/api/v1/students/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ message: "Student deleted successfully", data: student });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting student", error: err.message });
  }
});
const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Express server on http://localhost:${port}`),
);
