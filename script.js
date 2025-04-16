if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Error registering Service Worker:', error);
      });
  });
}

// Initialize Firebase (already done in index.html)
const database = firebase.database();
const studentsRef = database.ref('students');
const studentLogsRef = database.ref('student_logs'); // Reference to store logs

// DOM Element Selectors
const studentListContainer = document.getElementById('student-list-container');
const studentList = document.getElementById('students');
const addStudentForm = document.getElementById('add-student-form');
const searchInput = document.getElementById('search-input');
const enrollmentFieldsContainer = document.getElementById('enrollment-fields');
const misconductFieldsContainer = document.getElementById('misconduct-fields');
const releaseDateLabel = document.getElementById('releaseDateLabel');
const releaseDateInput = document.getElementById('releaseDate');
const studentIdInput = document.getElementById('student-id');
const viewModal = document.getElementById('view-modal');
const viewStudentName = document.getElementById('view-student-name');
const viewStudentDetails = document.getElementById('view-student-details');
const closeModalButton = document.querySelector('.close-button');
const searchIcon = document.querySelector('.search-icon');
const collapsibleButton = document.querySelector('.collapsible');
const recordsContent = document.querySelector('.content');
const lrnInput = document.getElementById('lrn');
const sexInput = document.getElementById('sex');
const contactInput = document.getElementById('contact');
const guardianInput = document.getElementById('guardian');
const learningModalityInput = document.getElementById('learningModality');
const schoolRecordReleasedCheckbox = document.getElementById('schoolRecordReleased');
const confirmationMessage = document.getElementById('confirmation-message');
const errorMessage = document.getElementById('error-message');

// New DOM Element Selectors
const juniorHighGraduationDateInput = document.getElementById('juniorHighGraduationDate');
const seniorHighGraduationDateInput = document.getElementById('seniorHighGraduationDate');
const juniorHighHonorsInput = document.getElementById('juniorHighHonors');
const seniorHighHonorsInput = document.getElementById('seniorHighHonors');
// const remarksInput = document.getElementById('remarks'); // Removed this line

let enrollmentCounter = 0;
let misconductCounter = 0;
let allStudentsData = []; // Store all fetched student data

function renderStudents(data) {
    studentList.innerHTML = '';
    if (data.length > 0) {
        data.forEach(studentData => {
            const student = studentData.val();
            const studentId = studentData.key;
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div>
                    <strong>LRN:</strong> ${student.lrn}<br>
                    <strong>Name:</strong> ${student.firstName} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName}
                </div>
                <div>
                    <button class="view-btn" onclick="viewStudent('${studentId}')">View</button>
                    <button class="edit-btn" onclick="editStudent('${studentId}')">Edit</button>
                </div>
            `;
            studentList.appendChild(listItem);
        });
    } else {
        const listItem = document.createElement('li');
        listItem.textContent = "No matching student records found.";
        studentList.appendChild(listItem);
    }
}

function saveStudentData(newStudentData, studentId = null) {
    const userId = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;

    if (studentId) {
        console.log(`Attempting to update student with ID: ${studentId}`, newStudentData);
        // Fetch current data to compare for logging
        return studentsRef.child(studentId).get().then((snapshot) => {
            const currentStudentData = snapshot.val();
            const changes = {};

            function compareObjects(oldData, newData, prefix = '') {
                for (const key in newData) {
                    if (newData.hasOwnProperty(key)) {
                        const oldValue = oldData ? oldData[key] : undefined;
                        const newValue = newData[key];

                        if (typeof newValue === 'object' && newValue !== null) {
                            if (typeof oldValue === 'object' && oldValue !== null) {
                                compareObjects(oldValue, newValue, prefix + key + '.');
                            } else if (oldValue !== newValue) {
                                changes[prefix + key] = { from: oldValue === undefined ? null : oldValue, to: newValue };
                            }
                        } else if (oldValue !== newValue) {
                            changes[prefix + key] = { from: oldValue === undefined ? null : oldValue, to: newValue };
                        }
                    }
                }
                if (oldData) {
                    for (const key in oldData) {
                        if (oldData.hasOwnProperty(key) && !newData.hasOwnProperty(key)) {
                            changes[prefix + key] = { from: oldData[key], to: null };
                        }
                    }
                }
            }

            compareObjects(currentStudentData, newStudentData);
            console.log("Detected changes:", changes); // Add this line

            if (Object.keys(changes).length > 0) {
                console.log("Changes detected, creating log entry..."); // Add this line
                const logEntry = {
                    studentId: studentId,
                    changes: changes,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    userId: userId // Include the user's UID
                };
                console.log("User ID for log:", userId); // Add this line
                // Filter out any changes where from is undefined
                const filteredChanges = {};
                for (const key in logEntry.changes) {
                    if (logEntry.changes.hasOwnProperty(key) && logEntry.changes[key].from !== undefined) {
                        filteredChanges[key] = logEntry.changes[key];
                    } else if (logEntry.changes.hasOwnProperty(key) && logEntry.changes[key].from === undefined) {
                        filteredChanges[key] = { from: null, to: logEntry.changes[key].to };
                    }
                }
                logEntry.changes = filteredChanges;

                studentLogsRef.push(logEntry);
                console.log("Change log created:", logEntry);
            }

            return studentsRef.child(studentId).update(newStudentData)
                .then(() => {
                    console.log(`Data updated successfully for ID: ${studentId}`);
                })
                .catch(error => {
                    console.error("Error updating data:", error);
                    errorMessage.textContent = "Failed to update data.";
                    errorMessage.style.display = 'block';
                    setTimeout(() => {
                        errorMessage.style.display = 'none';
                    }, 3000);
                    throw error; // Re-throw the error to prevent .then after failure
                });
        }).catch(error => {
            console.error("Error fetching current data for update:", error);
            errorMessage.textContent = "Failed to retrieve current data for update.";
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 3000);
            // Optionally, you might want to reject the promise here as well
            return Promise.reject(error);
        });
    } else {
        console.log("Attempting to add new student:", newStudentData);
        return studentsRef.push(newStudentData)
            .then(ref => {
                console.log(`New data pushed with ID: ${ref.key}`);
            })
            .catch(error => {
                console.error("Error pushing data:", error);
                errorMessage.textContent = "Failed to save data.";
                errorMessage.style.display = 'block';
                setTimeout(() => {
                    errorMessage.style.display = 'none';
                }, 3000);
                throw error; // Re-throw the error
            });
    }
}

addStudentForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const lrn = document.getElementById('lrn').value;
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const middleName = document.getElementById('middleName').value;
    const sex = document.getElementById('sex').value;
    const contact = document.getElementById('contact').value;
    const address = document.getElementById('address').value;
    const dob = document.getElementById('dob').value;
    const parents = document.getElementById('parents').value;
    const guardian = document.getElementById('guardian').value;
    const religion = document.getElementById('religion').value;
    const fourPs = document.getElementById('fourPs').checked;
    const club = document.getElementById('club').value;
    const learningModality = document.getElementById('learningModality').value;
    const schoolRecordReleased = document.getElementById('schoolRecordReleased').checked;
    const releaseDate = document.getElementById('releaseDate').value;
    const currentStudentId = studentIdInput.value;

    // New fields
    const juniorHighGraduationDate = juniorHighGraduationDateInput.value;
    const seniorHighGraduationDate = seniorHighGraduationDateInput.value;
    const juniorHighHonors = juniorHighHonorsInput.value;
    const seniorHighHonors = seniorHighHonorsInput.value;
    const remarks = document.getElementById('remarks').value; // Updated to get value from select

    const enrollmentHistory = {};
    document.querySelectorAll('.enrollment-record').forEach((record, index) => {
        const schoolYear = record.querySelector('.school-year').value;
        const enrollmentDate = record.querySelector('.enrollment-date').value;
        if (schoolYear && enrollmentDate) {
            enrollmentHistory[`enrollment_${index}`] = { schoolYear, enrollmentDate };
        }
    });

    const misconductInstances = {};
    document.querySelectorAll('.misconduct-instance').forEach((instance, index) => {
        const reason = instance.querySelector('.misconduct-reason').value;
        const date = instance.querySelector('.misconduct-date').value;
        const personsInvolved = instance.querySelector('.misconduct-persons').value;
        if (reason) {
            misconductInstances[`misconduct_${index}`] = { reason, date, personsInvolved };
        }
    });

    const newStudent = {
        lrn,
        firstName,
        lastName,
        middleName,
        sex,
        contact,
        address,
        dob,
        parents,
        guardian,
        religion,
        fourPs,
        club,
        learningModality,
        enrollmentHistory,
        misconductInstances,
        schoolRecordReleased,
        releaseDate: schoolRecordReleased ? releaseDate : null,
        juniorHighGraduationDate,
        seniorHighGraduationDate,
        juniorHighHonors,
        seniorHighHonors,
        remarks
    };

    console.log("Data being saved:", newStudent); // Inspect data being saved
    console.log("Current Student ID before save:", currentStudentId); // Inspect student ID

    // Check for duplicate LRN if it's a new student
    if (!currentStudentId) {
        const isDuplicate = allStudentsData.some(studentData => studentData.val().lrn === lrn);
        if (isDuplicate) {
            errorMessage.textContent = `LRN "${lrn}" already exists. Please enter a unique LRN.`;
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 3000);
            return;
        }
    }

    saveStudentData(newStudent, currentStudentId)
        .then(() => {
            addStudentForm.reset();
            enrollmentFieldsContainer.innerHTML = '';
            misconductFieldsContainer.innerHTML = '';
            enrollmentCounter = 0;
            misconductCounter = 0;
            releaseDateLabel.style.display = 'none';
            releaseDateInput.style.display = 'none';
            studentIdInput.value = ''; // Clear student ID after saving
            lrnInput.disabled = false; // Re-enable LRN for new entries
            document.querySelector('#student-form h2').textContent = 'Add New Student / Edit Student';
            // Display confirmation message
            confirmationMessage.style.display = 'block';
            setTimeout(() => {
                confirmationMessage.style.display = 'none';
            }, 3000);
        })
        .catch(error => {
            // Error handling is now inside saveStudentData
            console.error("Error during save operation:", error); // Log error here as well
        });
});

function editStudent(studentId) {
    studentIdInput.value = studentId;
    document.querySelector('#student-form h2').textContent = 'Edit Student';
    lrnInput.disabled = true; // Disable LRN field for editing

    studentsRef.child(studentId).get().then((snapshot) => {
        if (snapshot.exists()) {
            const student = snapshot.val();
            const releaseDateValue = student.releaseDate;

            document.getElementById('lrn').value = student.lrn || '';
            document.getElementById('firstName').value = student.firstName || '';
            document.getElementById('lastName').value = student.lastName || '';
            document.getElementById('middleName').value = student.middleName || '';
            document.getElementById('sex').value = student.sex || '';
            document.getElementById('contact').value = student.contact || '';
            document.getElementById('address').value = student.address || '';
            document.getElementById('dob').value = student.dob || '';
            document.getElementById('parents').value = student.parents || '';
            document.getElementById('guardian').value = student.guardian || '';
            document.getElementById('religion').value = student.religion || '';
            document.getElementById('fourPs').checked = student.fourPs || false;
            document.getElementById('club').value = student.club || '';
            document.getElementById('learningModality').value = student.learningModality || '';
            document.getElementById('schoolRecordReleased').checked = student.schoolRecordReleased || false;
            document.getElementById('releaseDate').value = releaseDateValue || '';
            toggleReleaseDate();

            // New fields population
            juniorHighGraduationDateInput.value = student.juniorHighGraduationDate || '';
            seniorHighGraduationDateInput.value = student.seniorHighGraduationDate || '';
            juniorHighHonorsInput.value = student.juniorHighHonors || '';
            seniorHighHonorsInput.value = student.seniorHighHonors || '';
            document.getElementById('remarks').value = student.remarks || ''; // Populate the select dropdown

            // Enable/disable School Record Release fields based on existing data
            if (releaseDateValue) {
                schoolRecordReleasedCheckbox.disabled = true;
                releaseDateInput.disabled = true;
            } else {
                schoolRecordReleasedCheckbox.disabled = false;
                releaseDateInput.disabled = false;
            }

            // Populate enrollment history
            enrollmentFieldsContainer.innerHTML = '';
            enrollmentCounter = 0;
            if (student.enrollmentHistory) {
                Object.values(student.enrollmentHistory).forEach(enrollment => {
                    addEnrollment(enrollment.schoolYear, enrollment.enrollmentDate);
                });
            } else {
                addEnrollment(); // Add at least one empty enrollment field for editing
            }

            // Populate misconduct instances
            misconductFieldsContainer.innerHTML = '';
            misconductCounter = 0;
            if (student.misconductInstances) {
                Object.values(student.misconductInstances).forEach(misconduct => {
                    addMisconduct(misconduct.reason, misconduct.date, misconduct.personsInvolved);
                });
            } else {
                addMisconduct(); // Add at least one empty misconduct field for editing
            }

        } else {
            console.log("No data available for this student ID.");
            errorMessage.textContent = "No data found for this student.";
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 3000);
            clearForm();
        }
    }).catch((error) => {
        console.error("Error getting student data:", error);
        errorMessage.textContent = "Failed to retrieve student data for editing.";
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
        clearForm();
    });

    console.log("Student ID set for editing:", studentIdInput.value); // Added console log
}

function displayAccountHistory(studentId, userId, container) {
    container.innerHTML = '<h3>Account History</h3>';
    if (!userId) {
        container.innerHTML += '<p>Not logged in.</p>';
        return;
    }

    studentLogsRef.orderByChild('studentId').equalTo(studentId)
        .once('value', (logsSnapshot) => {
            const userSpecificLogs = [];
            logsSnapshot.forEach((log) => {
                const logData = log.val();
                if (logData.userId === userId) {
                    userSpecificLogs.push(log);
                }
            });

            if (userSpecificLogs.length > 0) {
                container.innerHTML += '<ul>';
                userSpecificLogs.forEach((log) => {
                    const logData = log.val();
                    const timestamp = new Date(logData.timestamp).toLocaleString();
                    container.innerHTML += `<li><strong>Date:</strong> ${timestamp}<ul>`;
                    for (const field in logData.changes) {
                        if (logData.changes.hasOwnProperty(field)) {
                            container.innerHTML += `<li><strong>${field}:</strong> From "${logData.changes[field].from === undefined ? 'N/A' : logData.changes[field].from}" to "${logData.changes[field].to === undefined ? 'N/A' : logData.changes[field].to}"</li>`;
                        }
                    }
                    container.innerHTML += '</ul></li>';
                });
                container.innerHTML += '</ul>';
            } else {
                container.innerHTML += '<p>No account history available for this student.</p>';
            }
        });
}

function viewStudent(studentId) {
    studentsRef.child(studentId).get().then((studentSnapshot) => {
        if (studentSnapshot.exists()) {
            const student = studentSnapshot.val();
            viewStudentName.textContent = `${student.firstName} ${student.middleName || ''} ${student.lastName}`;
            let detailsHTML = `
                <p><strong>LRN:</strong> ${student.lrn}</p>
                <p><strong>Sex:</strong> ${student.sex || 'N/A'}</p>
                <p><strong>Contact Number:</strong> ${student.contact || 'N/A'}</p>
                <p><strong>Address:</strong> ${student.address || 'N/A'}</p>
                <p><strong>Date of Birth:</strong> ${student.dob || 'N/A'}</p>
                <p><strong>Parents:</strong> ${student.parents || 'N/A'}</p>
                <p><strong>Guardian:</strong> ${student.guardian || 'N/A'}</p>
                <p><strong>Religion:</strong> ${student.religion || 'N/A'}</p>
                <p><strong>Member of 4P's:</strong> ${student.fourPs ? 'Yes' : 'No'}</p>
                <p><strong>Club Membership:</strong> ${student.club || 'N/A'}</p>
                <p><strong>Learning Modality:</strong> ${student.learningModality || 'N/A'}</p>
                <p><strong>Date of Graduation in Junior High School:</strong> ${student.juniorHighGraduationDate || 'N/A'}</p>
                <p><strong>Date of Graduation in Senior High School:</strong> ${student.seniorHighGraduationDate || 'N/A'}</p>
                <p><strong>Honors Received in Junior High School:</strong> ${student.juniorHighHonors || 'N/A'}</p>
                <p><strong>Honors Received in Senior High School:</strong> ${student.seniorHighHonors || 'N/A'}</p>
                <p><strong>Remarks:</strong> ${student.remarks || 'N/A'}</p>
                <p><strong>Enrollment History:</strong></p>
                <ul>
                    ${student.enrollmentHistory ? Object.values(student.enrollmentHistory).map(enrollment => `<li><strong>School Year:</strong> ${enrollment.schoolYear}, <strong>Date:</strong> ${enrollment.enrollmentDate}</li>`).join('') : 'No enrollment history'}
                </ul>
                <p><strong>Misconduct Instances:</strong></p>
                <ul>
                    ${student.misconductInstances ? Object.values(student.misconductInstances).map(misconduct => `<li><strong>Reason:</strong> ${misconduct.reason}, <strong>Date:</strong> ${misconduct.date || 'N/A'}, <strong>Persons Involved:</strong> ${misconduct.personsInvolved || 'N/A'}</li>`).join('') : 'No misconduct instances'}
                </ul>
                <p><strong>School Record Released:</strong> ${student.schoolRecordReleased ? 'Yes' : 'No'}</p>
                ${student.schoolRecordReleased && student.releaseDate ? `<p><strong>Release Date:</strong> ${student.releaseDate}</p>` : ''}
            `;

            // Fetch and display general history
            studentLogsRef.orderByChild('studentId').equalTo(studentId).once('value', (logsSnapshot) => {
                let historyHTML = '<h3>Account History</h3>';
                if (logsSnapshot.exists()) {
                    historyHTML += '<ul>';
                    logsSnapshot.forEach((log) => {
                        console.log("Retrieved log entry:", log.val()); // Keep this for debugging if needed
                        const logData = log.val();
                        const timestamp = new Date(logData.timestamp).toLocaleString();
                        historyHTML += `<li><strong>Date:</strong> ${timestamp}<ul>`;
                        for (const field in logData.changes) {
                            if (logData.changes.hasOwnProperty(field)) {
                                historyHTML += `<li><strong>${field}:</strong> From "${logData.changes[field].from === undefined ? 'N/A' : logData.changes[field].from}" to "${logData.changes[field].to === undefined ? 'N/A' : logData.changes[field].to}"</li>`;
                            }
                        }
                        historyHTML += '</ul></li>';
                    });
                    historyHTML += '</ul>';
                } else {
                    historyHTML += '<p>No history available for this student.</p>';
                }

                viewStudentDetails.innerHTML = detailsHTML + historyHTML; // Removed accountHistoryContainer
                viewModal.style.display = "block";
            });
        } else {
            console.log("No data available for this student ID.");
            errorMessage.textContent = "No data found for this student.";
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 3000);
        }
    }).catch((error) => {
        console.error("Error getting student data:", error);
        errorMessage.textContent = "Failed to retrieve student data.";
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    });

    console.log("Student ID set for editing:", studentIdInput.value); // Added console log
}

searchInput.addEventListener('input', function() {
    const searchTerm = searchInput.value.toLowerCase();
    const results = allStudentsData.filter(studentData => {
        const student = studentData.val();
        return (student.lrn && student.lrn.toLowerCase().startsWith(searchTerm)) ||
               (student.firstName && student.firstName.toLowerCase().startsWith(searchTerm)) ||
               (student.lastName && student.lastName.toLowerCase().startsWith(searchTerm));
    });
    renderStudents(results);
});

// Event listener for the collapsible button
const collapsibleButtons = document.querySelectorAll('.collapsible');
collapsibleButtons.forEach(button => {
    button.addEventListener('click', function() {
        this.classList.toggle('active');
        const content = this.nextElementSibling;
        if (content.style.display === 'block') {
            content.style.display = 'none';
        } else {
            content.style.display = 'block';
            // renderStudents(allStudentsData); // Removed this line
        }
    });
});

function addEnrollment(schoolYear = `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`, enrollmentDate = '') {
    enrollmentCounter++;
    const enrollmentDiv = document.createElement('div');
    enrollmentDiv.classList.add('enrollment-record');
    enrollmentDiv.innerHTML = `
        <h3>Enrollment ${enrollmentCounter}</h3>
        <label for="schoolYear_${enrollmentCounter}">School Year:</label>
        <input type="text" class="school-year" id="schoolYear_${enrollmentCounter}" value="${schoolYear}"><br><br>
        <label for="enrollmentDate_${enrollmentCounter}">Enrollment Date:</label>
        <input type="date" class="enrollment-date" id="enrollmentDate_${enrollmentCounter}" value="${enrollmentDate}"><br><br>
        <button type="button" class="remove-btn" onclick="removeEnrollment(this)">Remove</button>
    `;
    enrollmentFieldsContainer.appendChild(enrollmentDiv);
}

function removeEnrollment(button) {
    button.parentNode.remove();
}

function addMisconduct(reason = '', date = '', personsInvolved = '') {
    misconductCounter++;
    const misconductDiv = document.createElement('div');
    misconductDiv.classList.add('misconduct-instance');
    misconductDiv.innerHTML = `
        <h3>Misconduct Instance ${misconductCounter}</h3>
        <div>
            <label for="misconductReason_${misconductCounter}">Reason:</label>
            <textarea class="misconduct-reason" id="misconductReason_${misconductCounter}">${reason}</textarea>
        </div>
        <div>
            <label for="misconductDate_${misconductCounter}">Date:</label>
            <input type="date" class="misconduct-date" id="misconductDate_${misconductCounter}" value="${date}">
        </div>
        <div>
            <label for="misconductPersons_${misconductCounter}">Persons Involved:</label>
            <input type="text" class="misconduct-persons" id="misconductPersons_${misconductCounter}" value="${personsInvolved}">
        </div>
        <button type="button" class="remove-btn" onclick="removeMisconduct(this)">Remove</button>
    `;
    misconductFieldsContainer.appendChild(misconductDiv);
}

function removeMisconduct(button) {
    button.parentNode.remove();
}

function toggleReleaseDate() {
    if (document.getElementById('schoolRecordReleased').checked) {
        releaseDateLabel.style.display = 'inline';
        releaseDateInput.style.display = 'inline';
    } else {
        releaseDateLabel.style.display = 'none';
        releaseDateInput.style.display = 'none';
        document.getElementById('releaseDate').value = '';
    }
}

function clearForm() {
    document.getElementById('add-student-form').reset();
    enrollmentFieldsContainer.innerHTML = '';
    misconductFieldsContainer.innerHTML = '';
    enrollmentCounter = 0;
    misconductCounter = 0;
    releaseDateLabel.style.display = 'none';
    releaseDateInput.style.display = 'none';
    studentIdInput.value = '';
    lrnInput.disabled = false; // Re-enable LRN for new entries
    document.querySelector('#student-form h2').textContent = 'Add New Student / Edit Student';

    // Clear new fields
    juniorHighGraduationDateInput.value = '';
    seniorHighGraduationDateInput.value = '';
    juniorHighHonorsInput.value = '';
    seniorHighHonorsInput.value = '';
    document.getElementById('remarks').value = ''; // Clear the select dropdown

    addEnrollment(); // Add one default enrollment field
    addMisconduct(); // Add one default misconduct field
}

// Close modal functionality
const closeModalButtons = document.querySelectorAll('.close-button');
closeModalButtons.forEach(button => {
    button.addEventListener('click', function() {
        viewModal.style.display = "none";
    });
});

window.addEventListener('click', function(event) {
    if (event.target == viewModal) {
        viewModal.style.display = "none";
    }
});

// Fetch initial student data from Firebase
studentsRef.on('value', (snapshot) => {
    const studentData = [];
    snapshot.forEach((childSnapshot) => {
        studentData.push(childSnapshot);
    });
    allStudentsData = studentData; // Store all data
    renderStudents(allStudentsData); // Render initial data here
});

// Initial call to add default enrollment and misconduct fields
addEnrollment();
addMisconduct();