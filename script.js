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

let deferredInstallPrompt = null;
const installButton = document.getElementById('installButton');

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt fired');
    e.preventDefault();
    deferredInstallPrompt = e;
    installButton.style.display = 'block';
});

installButton.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredInstallPrompt = null;
        installButton.style.display = 'none'; 
    }
});

window.addEventListener('appinstalled', (evt) => {
    console.log('appinstalled', evt);
    
    if (installButton) {
        installButton.style.display = 'none';
    }
});

const database = firebase.database();
const studentsRef = database.ref('students');

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
const closeViewModalButton = document.getElementById('closeViewModal');
const searchIcon = document.querySelector('.search-icon');
const lrnInput = document.getElementById('lrn');
const sexInput = document.getElementById('sex');
const contactInput = document.getElementById('contact');
const guardianInput = document.getElementById('guardian');
const learningModalityInput = document.getElementById('learningModality');
const schoolRecordReleasedCheckbox = document.getElementById('schoolRecordReleased');
const confirmationMessage = document.getElementById('confirmation-message');
const errorMessage = document.getElementById('error-message');
const historyModal = document.getElementById('history-modal'); 
const historyDetails = document.getElementById('history-details'); 
const closeHistoryModalButton = document.getElementById('closeHistoryModal'); 

const juniorHighGraduationDateInput = document.getElementById('juniorHighGraduationDate');
const seniorHighGraduationDateInput = document.getElementById('seniorHighGraduationDate');
const juniorHighHonorsInput = document.getElementById('juniorHighHonors');
const seniorHighHonorsInput = document.getElementById('seniorHighHonors'); 

const addRecordModal = document.getElementById('addRecordModal');
const closeAddRecordModalButton = addRecordModal.querySelector('.close-button');
const addRecordButton = document.getElementById('addRecordButton');
const studentFormHeader = addRecordModal.querySelector('#student-form h2');

let enrollmentCounter = 0;
let misconductCounter = 0;
let allStudentsData = []; 
let currentViewingStudentId = null; 

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
        
    }
}

function saveStudentData(newStudentData, studentId = null) {
    const timestamp = new Date().toISOString();
    const currentUser = firebase.auth().currentUser;
    console.log("Current User Object in saveStudentData:", currentUser);
    const modifiedBy = currentUser ? currentUser.uid : 'Unknown User';
    const modifiedByUserDisplayName = currentUser ? (currentUser.displayName || currentUser.email || 'User ID: ' + modifiedBy) : 'Unknown User';
    console.log("Modified By User ID:", modifiedBy);
    console.log("Modified By User Display Name:", modifiedByUserDisplayName);

    if (studentId) {
        return studentsRef.child(studentId).get().then(snapshot => {
            const oldData = snapshot.val();
            const changes = {};
            for (const key in newStudentData) {
                if (newStudentData.hasOwnProperty(key)) {
                    const oldValue = oldData && oldData.hasOwnProperty(key) ? oldData[key] : null;
                    let changed = false;

                    if (key === 'enrollmentHistory' || key === 'misconductInstances') {
                        
                        const areObjectsEqual = (obj1, obj2) => {
                            if (obj1 === null || obj2 === null) return obj1 === obj2;
                            const keys1 = Object.keys(obj1);
                            const keys2 = Object.keys(obj2);
                            if (keys1.length !== keys2.length) return false;
                            for (let key of keys1) {
                                if (!obj2.hasOwnProperty(key) || JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
                                    return false;
                                }
                            }
                            return true;
                        };

                        if (!areObjectsEqual(oldValue, newStudentData[key])) {
                            changed = true;
                        }
                    } else {
                        if (oldValue !== newStudentData[key]) {
                            changed = true;
                        }
                    }

                    if (changed) {
                        changes[key] = { oldValue: oldValue, newValue: newStudentData[key] };
                    }
                }
            }

            if (Object.keys(changes).length > 0) {
                console.log("Detected Changes:", changes);
                const historyEntry = {
                    timestamp: timestamp,
                    changes: changes,
                    modifiedBy: modifiedBy,
                    modifiedByUserDisplayName: modifiedByUserDisplayName 
                };
                return studentsRef.child(studentId).child('history').once('value').then(historySnapshot => {
                    const existingHistory = historySnapshot.val() || [];
                    const updatedHistory = [...existingHistory, historyEntry];
                    return studentsRef.child(studentId).update({ ...newStudentData, history: updatedHistory });
                });
            } else {
                return Promise.resolve();
            }
        });
    } else {
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
                throw error;
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

    
    const juniorHighGraduationDate = juniorHighGraduationDateInput.value;
    const seniorHighGraduationDate = seniorHighGraduationDateInput.value;
    const juniorHighHonors = juniorHighHonorsInput.value;
    const seniorHighHonors = seniorHighHonorsInput.value; 
    const remarks = document.getElementById('remarks').value; 

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

    console.log("Data being saved:", newStudent); 
    console.log("Current Student ID before save:", currentStudentId); 

    
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
            studentIdInput.value = '';
            lrnInput.disabled = false; 
            studentFormHeader.textContent = 'Add New Student / Edit Student';
            addRecordModal.style.display = 'none';            
            confirmationMessage.style.display = 'block';
            setTimeout(() => {
                confirmationMessage.style.display = 'none';
            }, 3000);
        })
        .catch(error => {
           console.error("Error during save operation:", error); 
        });
});

function editStudent(studentId) {
    console.log("editStudent function called with ID:", studentId); 
    studentIdInput.value = studentId;
    studentFormHeader.textContent = 'Edit Student';
    lrnInput.disabled = true;
    addRecordModal.style.display = 'block'; 

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

            
            juniorHighGraduationDateInput.value = student.juniorHighGraduationDate || '';
            seniorHighGraduationDateInput.value = student.seniorHighGraduationDate || '';
            juniorHighHonorsInput.value = student.juniorHighHonors || '';
            seniorHighHonorsInput.value = student.seniorHighHonors || ''; 
            document.getElementById('remarks').value = student.remarks || ''; 

            
            if (releaseDateValue) {
                schoolRecordReleasedCheckbox.disabled = true;
                releaseDateInput.disabled = true;
            } else {
                schoolRecordReleasedCheckbox.disabled = false;
                releaseDateInput.disabled = false;
            }

            
            enrollmentFieldsContainer.innerHTML = '';
            enrollmentCounter = 0;
            if (student.enrollmentHistory) {
                Object.values(student.enrollmentHistory).forEach(enrollment => {
                    addEnrollment(enrollment.schoolYear, enrollment.enrollmentDate);
                });
            } else {
                addEnrollment(); 
            }

            
            misconductFieldsContainer.innerHTML = '';
            misconductCounter = 0;
            if (student.misconductInstances) {
                Object.values(student.misconductInstances).forEach(misconduct => {
                    addMisconduct(misconduct.reason, misconduct.date, misconduct.personsInvolved);
                });
            } else {
                addMisconduct(); 
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

    console.log("Student ID set for editing:", studentIdInput.value); 
}

function viewStudent(studentId) {
    currentViewingStudentId = studentId; 
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
                <button type="button" onclick="showHistory('${studentId}')">View Modification History</button>
            `;

            viewStudentDetails.innerHTML = detailsHTML;
            viewModal.style.display = "block";
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

    console.log("Student ID set for editing:", studentIdInput.value);
}

function showHistory(studentId) {
    const historyModal = document.getElementById('history-modal');
    const historyDetails = document.getElementById('history-details');
    if (!historyModal || !historyDetails) {
        console.error("Error: history-modal or history-details element not found.");
        return;
    }

    studentsRef.child(studentId).child('history').orderByChild('timestamp').get().then(snapshot => {
        console.log("History Snapshot Exists:", snapshot.exists());
        historyDetails.innerHTML = '';
        if (snapshot.exists()) {
            const historyData = snapshot.val();
            console.log("History Data:", historyData);
            if (historyData) {
                const historyEntries = Object.values(historyData);
                console.log("History Entries:", historyEntries);

                if (historyEntries.length > 0) {
                    historyEntries.forEach(entry => {
                        const entryDiv = document.createElement('div');
                        entryDiv.classList.add('history-entry');
                        const formattedTime = new Date(entry.timestamp).toLocaleString();
                        const modifiedByDisplayName = entry.modifiedByUserDisplayName; 
                        console.log("Processing History Entry - Modified By Display Name:", modifiedByDisplayName);

                        let changesHTML = '<p><strong>Changes:</strong></p><ul>';
                        let hasChanges = false;

                        for (const key in entry.changes) {
                            if (entry.changes.hasOwnProperty(key)) {
                                const change = entry.changes[key];
                                const oldValueString = JSON.stringify(change.oldValue);
                                const newValueString = JSON.stringify(change.newValue);

                                if (oldValueString !== newValueString) {
                                    hasChanges = true;
                                    changesHTML += `<li><strong>${key}:</strong> `;

                                    const formatObject = (obj) => {
                                        if (obj === null) return 'null';
                                        if (typeof obj !== 'object') {
                                            return obj;
                                        }
                                        let formattedString = '{ ';
                                        const properties = Object.keys(obj);
                                        properties.forEach((prop, index) => {
                                            formattedString += `${prop}: ${formatObject(obj[prop])}`;
                                            if (index < properties.length - 1) {
                                                formattedString += ', ';
                                            }
                                        });
                                        return formattedString;
                                    };

                                    if (key === 'enrollmentHistory') {
                                        changesHTML += `Old Value: ${formatObject(change.oldValue)}, New Value: ${formatObject(change.newValue)}`;
                                    } else if (key === 'misconductInstances') {
                                        changesHTML += `Old Value: ${formatObject(change.oldValue)}, New Value: ${formatObject(change.newValue)}`;
                                    } else {
                                        changesHTML += `Old Value: ${change.oldValue === null ? 'null' : change.oldValue}, New Value: ${change.newValue === null ? 'null' : change.newValue}`;
                                    }
                                    changesHTML += '</li>';
                                }
                            }
                        }
                        changesHTML += '</ul>';

                        if (hasChanges) {
                            entryDiv.innerHTML = `<h4>Modified At: ${formattedTime}</h4><p><strong>Modified By:</strong> ${modifiedByDisplayName}</p>${changesHTML}<hr>`;
                            historyDetails.appendChild(entryDiv);
                        }
                    });

                    if (historyDetails.innerHTML === '') {
                        historyDetails.textContent = "No modification history available for this student.";
                    }

                } else {
                    historyDetails.textContent = "No modification history available for this student.";
                }
            } else {
                historyDetails.textContent = "No modification history available for this student.";
            }
        } else {
            historyDetails.textContent = "No modification history available for this student.";
        }
        historyModal.style.display = 'block';
    }).catch(error => {
        console.error("Error fetching history:", error);
        historyDetails.textContent = "Failed to load modification history.";
        historyModal.style.display = 'block';
    });
}

searchInput.addEventListener('input', function() {
    const searchTerm = searchInput.value.toLowerCase();
    console.log("Search Input Value:", searchTerm); 

    if (searchTerm.trim() === "") {
        renderStudents([]); 
    } else {
        const results = allStudentsData.filter(studentData => {
            const student = studentData.val();
            return (student.lrn && student.lrn.toLowerCase().startsWith(searchTerm)) ||
                   (student.firstName && student.firstName.toLowerCase().startsWith(searchTerm)) ||
                   (student.lastName && student.lastName.toLowerCase().startsWith(searchTerm));
        });
        renderStudents(results);
    }
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
    lrnInput.disabled = false; 
    studentFormHeader.textContent = 'Add New Student / Edit Student';

    
    juniorHighGraduationDateInput.value = '';
    seniorHighGraduationDateInput.value = '';
    juniorHighHonorsInput.value = '';
    seniorHighHonorsInput.value = ''; 
    document.getElementById('remarks').value = ''; 

    addEnrollment(); 
    addMisconduct(); 
}


closeAddRecordModalButton.addEventListener('click', () => {
    addRecordModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target == addRecordModal) {
        addRecordModal.style.display = 'none';
    }
});


closeViewModalButton.addEventListener('click', function() {
    viewModal.style.display = "none";
});

window.addEventListener('click', function(event) {
    if (event.target == viewModal) {
        viewModal.style.display = "none";
    }
});


const closeHistoryModalButtonElement = document.getElementById('closeHistoryModal');
if (closeHistoryModalButtonElement) {
    closeHistoryModalButtonElement.addEventListener('click', function() {
        historyModal.style.display = "none";
    });
}

window.addEventListener('click', function(event) {
    if (event.target == historyModal) {
        historyModal.style.display = "none";
    }
});


addRecordButton.addEventListener('click', () => {
    addRecordModal.style.display = 'block';
    studentFormHeader.textContent = 'Add New Student'; 
    studentIdInput.value = ''; 
    lrnInput.disabled = false; 
    clearForm(); 
});


studentsRef.on('value', (snapshot) => {
    const studentData = [];
    snapshot.forEach((childSnapshot) => {
        studentData.push(childSnapshot);
    });
    allStudentsData = studentData; 

    
    if (searchInput.value.trim() === "") {
        renderStudents([]); 
    } else {
        
        const searchTerm = searchInput.value.toLowerCase();
        const results = allStudentsData.filter(studentData => {
            const student = studentData.val();
            return (student.lrn && student.lrn.toLowerCase().startsWith(searchTerm)) ||
                   (student.firstName && student.firstName.toLowerCase().startsWith(searchTerm)) ||
                   (student.lastName && student.lastName.toLowerCase().startsWith(searchTerm));
        });
        renderStudents(results);
    }
});


addEnrollment();
addMisconduct();