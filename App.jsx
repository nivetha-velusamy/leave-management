import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "/leaves";

function App() {
  const [leaves, setLeaves] = useState([]);

  const [form, setForm] = useState({
    employeeName: "",
    leaveType: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const fetchLeaves = async () => {
    try {
      const response = await axios.get(API);
      setLeaves(response.data);
    } catch (error) {
      alert("Server connect aagala. Backend check pannunga.");
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const applyLeave = async (e) => {
    e.preventDefault();

    if (form.endDate < form.startDate) {
      alert("End date, start date-ku appuram irukkanum!");
      return;
    }

    try {
      await axios.post(API, form);

      alert("Leave applied successfully!");

      setForm({
        employeeName: "",
        leaveType: "Casual Leave",
        startDate: "",
        endDate: "",
        reason: "",
      });

      fetchLeaves();
    } catch (error) {
      alert(error.response?.data?.message || "Leave apply panna mudiyala");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/${id}`, { status });
      fetchLeaves();
    } catch (error) {
      alert("Status update panna mudiyala");
    }
  };

  const deleteLeave = async (id) => {
    if (!window.confirm("Indha leave request delete pannalama?")) return;

    try {
      await axios.delete(`${API}/${id}`);
      fetchLeaves();
    } catch (error) {
      alert("Delete panna mudiyala");
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Leave Management System</h1>
        <p>Apply, manage and track employee leaves</p>
      </header>

      <div className="container">
        <section className="form-card">
          <h2>Apply for Leave</h2>

          <form onSubmit={applyLeave}>
            <label>Employee Name</label>
            <input
              type="text"
              name="employeeName"
              placeholder="Enter employee name"
              value={form.employeeName}
              onChange={handleChange}
              required
            />

            <label>Leave Type</label>
            <select
              name="leaveType"
              value={form.leaveType}
              onChange={handleChange}
            >
              <option>Casual Leave</option>
              <option>Sick Leave</option>
              <option>Annual Leave</option>
              <option>Emergency Leave</option>
            </select>

            <label>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              required
            />

            <label>End Date</label>
            <input
              type="date"
              name="endDate"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={handleChange}
              required
            />

            <label>Reason</label>
            <textarea
              name="reason"
              placeholder="Enter leave reason"
              value={form.reason}
              onChange={handleChange}
              required
            />

            <button type="submit" className="apply-btn">
              Apply Leave
            </button>
          </form>
        </section>

        <section className="list-section">
          <h2>Leave Requests</h2>

          {leaves.length === 0 ? (
            <p className="empty">No leave requests found.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave._id}>
                      <td>{leave.employeeName}</td>
                      <td>{leave.leaveType}</td>
                      <td>{leave.startDate}</td>
                      <td>{leave.endDate}</td>
                      <td>{leave.reason}</td>
                      <td>
                        <span
                          className={`status ${leave.status.toLowerCase()}`}
                        >
                          {leave.status}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="approve-btn"
                            onClick={() =>
                              updateStatus(leave._id, "Approved")
                            }
                          >
                            Approve
                          </button>

                          <button
                            className="reject-btn"
                            onClick={() =>
                              updateStatus(leave._id, "Rejected")
                            }
                          >
                            Reject
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() => deleteLeave(leave._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;