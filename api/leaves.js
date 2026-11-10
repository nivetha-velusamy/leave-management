import mongoose from 'mongoose';

// In-memory fallback if MONGODB_URI is not supplied
let memoryLeaves = [
  {
    _id: "demo-leave-1",
    employeeName: "John Doe",
    leaveType: "Sick Leave",
    startDate: "2026-11-12",
    endDate: "2026-11-14",
    reason: "Doctor appointment and recovery",
    status: "Pending",
    createdAt: new Date().toISOString()
  }
];

let cachedConnection = global._mongoConn;

async function connectToMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    cachedConnection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    global._mongoConn = cachedConnection;
    return cachedConnection;
  } catch (err) {
    console.warn("MongoDB connection failed, falling back to memory store:", err.message);
    return null;
  }
}

const LeaveSchema = new mongoose.Schema(
  {
    employeeName: { type: String, required: true },
    leaveType: { type: String, default: "Casual Leave" },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

const LeaveModel = mongoose.models.Leave || mongoose.model("Leave", LeaveSchema);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Extract ID from query param or URL
  let { id } = req.query || {};
  if (!id && req.url) {
    const segments = req.url.split("?")[0].split("/").filter(Boolean);
    if (segments.length >= 2 && segments[0] === "leaves") {
      id = segments[1];
    }
  }

  const isConnected = await connectToMongo();

  try {
    if (req.method === "GET") {
      if (isConnected) {
        const leaves = await LeaveModel.find().sort({ createdAt: -1 });
        return res.status(200).json(leaves);
      }
      return res.status(200).json(memoryLeaves);
    }

    if (req.method === "POST") {
      const { employeeName, leaveType, startDate, endDate, reason } = req.body || {};
      if (!employeeName || !startDate || !endDate || !reason) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (isConnected) {
        const newLeave = await LeaveModel.create({
          employeeName,
          leaveType: leaveType || "Casual Leave",
          startDate,
          endDate,
          reason,
          status: "Pending"
        });
        return res.status(201).json(newLeave);
      }

      const newLeave = {
        _id: "leave_" + Date.now(),
        employeeName,
        leaveType: leaveType || "Casual Leave",
        startDate,
        endDate,
        reason,
        status: "Pending",
        createdAt: new Date().toISOString()
      };
      memoryLeaves.unshift(newLeave);
      return res.status(201).json(newLeave);
    }

    if (req.method === "PATCH") {
      const { status } = req.body || {};
      if (!id) {
        return res.status(400).json({ message: "Leave ID is required" });
      }

      if (isConnected) {
        const updated = await LeaveModel.findByIdAndUpdate(
          id,
          { status },
          { new: true }
        );
        if (!updated) {
          return res.status(404).json({ message: "Leave not found" });
        }
        return res.status(200).json(updated);
      }

      const leave = memoryLeaves.find((l) => l._id === id);
      if (!leave) {
        return res.status(404).json({ message: "Leave not found" });
      }
      leave.status = status;
      return res.status(200).json(leave);
    }

    if (req.method === "DELETE") {
      if (!id) {
        return res.status(400).json({ message: "Leave ID is required" });
      }

      if (isConnected) {
        const deleted = await LeaveModel.findByIdAndDelete(id);
        if (!deleted) {
          return res.status(404).json({ message: "Leave not found" });
        }
        return res.status(200).json({ message: "Leave deleted successfully" });
      }

      const index = memoryLeaves.findIndex((l) => l._id === id);
      if (index === -1) {
        return res.status(404).json({ message: "Leave not found" });
      }
      memoryLeaves.splice(index, 1);
      return res.status(200).json({ message: "Leave deleted successfully" });
    }

    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}
