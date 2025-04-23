
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(error => {
            console.error('Error registering Service Worker:', error);
           
        });
    });
}


const installButton = document.getElementById('installButton');

function hideInstallButtonIfInstalled() {
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App is running in standalone mode.');
        if (installButton) {
            installButton.style.display = 'none'; 
        }
    } else {
         
         if (installButton) {
             installButton.style.display = 'block';
         }
    }
}


window.addEventListener('load', hideInstallButtonIfInstalled);

let deferredInstallPrompt = null;


window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt fired');
    
    e.preventDefault();
    
    deferredInstallPrompt = e;
    
    if (installButton) {
        installButton.style.display = 'block';
    }
});


if (installButton) {
    installButton.addEventListener('click', async () => {
        if (deferredInstallPrompt) {
            
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);            
            deferredInstallPrompt = null;            
            installButton.style.display = 'none';
        }
    });
}

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
const searchInput = document.getElementById('search-input');

const addRecordModal = document.getElementById('addRecordModal');
const closeAddRecordModalButton = addRecordModal ? addRecordModal.querySelector('.close-button') : null;
const addRecordButton = document.getElementById('addRecordButton');
const studentFormHeader = addRecordModal ? addRecordModal.querySelector('#student-form h2') : null;
const addStudentForm = document.getElementById('add-student-form');


const studentIdInput = document.getElementById('student-id');
const lrnInput = document.getElementById('lrn');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const middleNameInput = document.getElementById('middleName');
const sexInput = document.getElementById('sex');
const contactInput = document.getElementById('contact');
const addressInput = document.getElementById('address');
const dobInput = document.getElementById('dob');
const parentsInput = document.getElementById('parents');
const guardianInput = document.getElementById('guardian');
const religionInput = document.getElementById('religion');
const fourPsInput = document.getElementById('fourPs');
const clubInput = document.getElementById('club');
const learningModalityInput = document.getElementById('learningModality');
const juniorHighGraduationDateInput = document.getElementById('juniorHighGraduationDate');
const seniorHighGraduationDateInput = document.getElementById('seniorHighGraduationDate');
const juniorHighHonorsInput = document.getElementById('juniorHighHonors');
const seniorHighHonorsInput = document.getElementById('seniorHighHonors');
const remarksInput = document.getElementById('remarks');
const notesInput = document.getElementById('notes');


const enrollmentFieldsContainer = document.getElementById('enrollment-fields');
const misconductFieldsContainer = document.getElementById('misconduct-fields');
const schoolRecordReleaseFieldsContainer = document.getElementById('school-record-release-fields');


const viewModal = document.getElementById('view-modal');
const viewStudentName = document.getElementById('view-student-name');
const viewStudentDetails = document.getElementById('view-student-details');
const closeViewModalButton = document.getElementById('closeViewModal');

const historyModal = document.getElementById('history-modal');
const historyDetails = document.getElementById('history-details');
const closeHistoryModalButton = document.getElementById('closeHistoryModal');


const bulkAddButton = document.getElementById('bulkAddButton');
const bulkAddModal = document.getElementById('bulkAddModal');
const closeBulkAddModalButton = document.getElementById('closeBulkAddModal');
const bulkAddFormsContainer = document.getElementById('bulkAddFormsContainer');
const addBulkRecordButton = document.getElementById('addBulkRecordButton');

const confirmationMessage = document.getElementById('confirmation-message');
const errorMessage = document.getElementById('error-message');


let enrollmentCounter = 0;
let misconductCounter = 0;
let schoolRecordReleaseCounter = 0;
let allStudentsData = [];
let currentViewingStudentId = null;


function renderStudents(data) {
    
    if (studentList) {
        studentList.innerHTML = '';
    } else {
        console.error("Student list element #students not found during render.");
        return; 
    }

    if (data && data.length > 0) {        
        data.forEach(studentData => {
            const student = studentData.val(); 
            const studentId = studentData.key; 

            
            const listItem = document.createElement('li');
            
            listItem.innerHTML = `
                <div>
                    <strong>LRN:</strong> ${student.lrn || 'N/A'}<br>
                    <strong>Name:</strong> ${student.firstName || ''} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName || ''}
                </div>
                <div>
                    <button class="view-btn" onclick="viewStudent('${studentId}')">View</button>
                    <button class="edit-btn" onclick="editStudent('${studentId}')">Edit</button>
                </div>
            `;

            
            studentList.appendChild(listItem);
        });
    } else {
        
        const noResultsItem = document.createElement('li');
        const searchTerm = searchInput ? searchInput.value.trim() : "";
        noResultsItem.textContent = searchTerm === "" ? "Start typing to search for students." : "No students found matching your search.";
        noResultsItem.style.justifyContent = 'center';
        noResultsItem.style.fontStyle = 'italic';
        studentList.appendChild(noResultsItem);
    }
}


const areObjectsDeepEqual = (obj1, obj2) => {
    
    if (obj1 === obj2) return true;

   
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false;

    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    
    if (keys1.length !== keys2.length) return false;

   
    for (const key of keys1) {
        
        if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false;
        
        if (!areObjectsDeepEqual(obj1[key], obj2[key])) return false;
    }

    
    return true;
};


const isEffectivelyEmpty = (value) => {
    if (value === null || value === undefined || value === "") {
        return true;
    }
    if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value) && value.length === 0) {
            return true;
        }       
        if (value.constructor === Object && Object.keys(value).length === 0) {
             return true;
        }
    }
    return false;
};


function saveStudentData(newStudentData, studentId = null) {
    const timestamp = new Date().toISOString();
    const currentUser = firebase.auth().currentUser; 
   
    const modifiedBy = currentUser ? currentUser.uid : 'Unknown User';
    const modifiedByUserDisplayName = currentUser ? (currentUser.displayName || currentUser.email || 'User ID: ' + modifiedBy) : 'Unknown User';
    const createdByEmail = currentUser ? currentUser.email : 'Unknown User';

   
    if (studentId) {
        console.log(`[SAVE] Attempting to update student ID: ${studentId}`);
        console.log("[SAVE] New data from form:", newStudentData);

        
        return studentsRef.child(studentId).get().then(snapshot => {
            const oldData = snapshot.val(); 
            console.log("[SAVE] Old data from Firebase:", oldData);

            const changes = {}; 
           
            const fieldsToCompare = [
                'lrn', 'firstName', 'lastName', 'middleName', 'sex', 'contact', 'address',
                'dob', 'parents', 'guardian', 'religion', 'fourPs', 'club', 'learningModality',
                'juniorHighGraduationDate', 'seniorHighGraduationDate',
                'juniorHighHonors', 'seniorHighHonors', 'remarks', 'notes',
                'enrollmentHistory', 'misconductInstances', 'schoolRecordReleases'
            ];

         
            const cleanedNewStudentData = { ...newStudentData };
            fieldsToCompare.forEach(key => {
                 if (isEffectivelyEmpty(cleanedNewStudentData[key])) {
                      
                      cleanedNewStudentData[key] = null;
                 }
            });

            const cleanedOldData = { ...oldData };
             fieldsToCompare.forEach(key => {
                 if (isEffectivelyEmpty(cleanedOldData[key])) {
                      cleanedOldData[key] = null;
                 }
            });

            
            fieldsToCompare.forEach(key => {
                const oldValue = cleanedOldData && cleanedOldData.hasOwnProperty(key) ? cleanedOldData[key] : null;
                const newValue = cleanedNewStudentData.hasOwnProperty(key) ? cleanedNewStudentData[key] : null;

                let changed = false;

                 if (key === 'fourPs') {
                     
                     changed = (oldValue === true) !== (newValue === true);
                     if(changed) console.log(`[SAVE] Change detected for ${key}: Old=${oldValue}, New=${newValue} (Boolean comparison)`);
                 } else if (['enrollmentHistory', 'misconductInstances', 'schoolRecordReleases'].includes(key)) {
                      
                      const oldObj = typeof oldValue === 'object' && oldValue !== null ? oldValue : {}; 
                      const newObj = typeof newValue === 'object' && newValue !== null ? newValue : {};
                       changed = !areObjectsDeepEqual(oldObj, newObj);
                      if(changed) console.log(`[SAVE] Change detected for ${key}: Old=${JSON.stringify(oldValue)}, New=${JSON.stringify(newValue)} (Deep comparison)`);
                 } else {
                     
                      changed = oldValue !== newValue;
                       if(changed) console.log(`[SAVE] Change detected for ${key}: Old=${oldValue}, New=${newValue} (Primitive comparison)`);
                 }

                
                if (changed) {
                    
                    changes[key] = {
                        oldValue: oldData && oldData.hasOwnProperty(key) ? oldData[key] : null,
                        newValue: newStudentData.hasOwnProperty(key) ? newStudentData[key] : null
                    };
                }
            });

            console.log("[SAVE] Detected changes for history:", changes);
           


             const updateData = { ...newStudentData };
          
             Object.keys(updateData).forEach(key => {
                 if (isEffectivelyEmpty(updateData[key])) {
                      updateData[key] = null;
                 }
            });


           
            if (Object.keys(changes).length > 0) {
                console.log("[SAVE] Changes detected. Proceeding with update and history logging.");
                
                const historyEntry = {
                    timestamp: timestamp,
                    changes: changes, 
                    modifiedBy: modifiedBy,
                    modifiedByUserDisplayName: modifiedByUserDisplayName
                };

               
                return studentsRef.child(studentId).child('history').once('value').then(historySnapshot => {
                    const existingHistory = historySnapshot.val() || [];
                    
                    const historyArray = Array.isArray(existingHistory) ? existingHistory : Object.values(existingHistory);
                    const updatedHistory = [...historyArray, historyEntry];

                   
                    updateData.history = updatedHistory;

                    console.log("[SAVE] Data being sent to Firebase update:", updateData);

                   
                    return studentsRef.child(studentId).update(updateData)
                        .then(() => {
                            console.log(`[SAVE] Successfully updated student ID: ${studentId}`);
                        })
                        .catch(error => {
                             console.error(`[SAVE] Error during Firebase update for ID ${studentId}:`, error);
                             errorMessage.textContent = "Failed to update student data in Firebase.";
                             errorMessage.style.display = 'block';
                             setTimeout(() => { if(errorMessage) errorMessage.style.display = 'none'; }, 5000);
                             throw error;
                        });
                });
            } else {
                
                console.log("[SAVE] No detectable changes for history logging. Checking if cleanup is needed.");
                 
                 if (Object.keys(updateData).length > 0) {
                     console.log("[SAVE] No history changes, but cleaning up empty fields in Firebase by sending update with nulls.");
                      return studentsRef.child(studentId).update(updateData)
                        .then(() => {
                            console.log(`[SAVE] Successfully cleaned up empty fields for student ID: ${studentId}`);
                        })
                        .catch(error => {
                             console.error(`[SAVE] Error during Firebase update for cleaning ID ${studentId}:`, error);
                             errorMessage.textContent = "Failed to clean up empty fields in Firebase.";
                             errorMessage.style.display = 'block';
                             setTimeout(() => { if(errorMessage) errorMessage.style.display = 'none'; }, 5000);
                             throw error; 
                        });
                 } else {
                     
                     console.log("[SAVE] No changes or cleanup needed. Update skipped.");
                     return Promise.resolve(); 
                 }
            }
        })
        .catch(error => {
             
             console.error("[SAVE] Error during fetch for update check:", error);
             errorMessage.textContent = "Failed to fetch student data for update check.";
             errorMessage.style.display = 'block';
             setTimeout(() => { if(errorMessage) errorMessage.style.display = 'none'; }, 5000);
             throw error; 
        });

    } else {
        console.log("[SAVE] Attempting to add new student.");
        console.log("[SAVE] New data from form:", newStudentData);

        
        const creationDetails = {
            timestamp: timestamp,
            createdByEmail: createdByEmail
        };

        
        const dataToPush = { ...newStudentData };
        
        Object.keys(dataToPush).forEach(key => {
             if (isEffectivelyEmpty(dataToPush[key])) {
                 delete dataToPush[key]; 
             }
        });

        console.log("[SAVE] Data being sent to Firebase push:", dataToPush);

        
        return studentsRef.push(dataToPush).then(newRecord => {
            const newRecordKey = newRecord.key; 
            console.log(`[SAVE] Successfully added new student with ID: ${newRecordKey}`);

           
            return studentsRef.child(newRecordKey).child('creationDetails').set(creationDetails)
                 .then(() => {
                     console.log(`[SAVE] Successfully added creation details for ID: ${newRecordKey}`);
                     return newRecordKey; 
                 })
                 .catch(error => {
                     console.error(`[SAVE] Error setting creation details for ID ${newRecordKey}:`, error);
                      errorMessage.textContent = "Failed to set creation details for new student.";
                      errorMessage.style.display = 'block';
                      setTimeout(() => { errorMessage.style.display = 'none'; }, 5000);
                      throw error; 
                 });
        })
        .catch(error => {
             
             errorMessage.textContent = "Failed to save new student data.";
             errorMessage.style.display = 'block';
             setTimeout(() => { errorMessage.style.display = 'none'; }, 3000);
             console.error("Error during save operation (add new):", error);
             throw error; 
        });
    }
}



if (addStudentForm) {
    addStudentForm.addEventListener('submit', function(e) {
        e.preventDefault(); 
        console.log("addStudentForm submit event triggered!");

        
        const lrn = lrnInput ? lrnInput.value.trim() : '';
        const firstName = firstNameInput ? firstNameInput.value.trim() : '';
        const lastName = lastNameInput ? lastNameInput.value.trim() : '';
        const middleName = middleNameInput ? middleNameInput.value.trim() : '';
        const sex = sexInput ? sexInput.value : '';
        const contact = contactInput ? contactInput.value.trim() : '';
        const address = addressInput ? addressInput.value.trim() : '';
        const dob = dobInput ? dobInput.value : '';
        const parents = parentsInput ? parentsInput.value.trim() : '';
        const guardian = guardianInput ? guardianInput.value.trim() : '';
        const religion = religionInput ? religionInput.value.trim() : '';
        const fourPs = fourPsInput ? fourPsInput.checked : false;
        const club = clubInput ? clubInput.value.trim() : '';
        const learningModality = learningModalityInput ? learningModalityInput.value : '';
        const juniorHighGraduationDate = juniorHighGraduationDateInput ? juniorHighGraduationDateInput.value : '';
        const seniorHighGraduationDate = seniorHighGraduationDateInput ? seniorHighGraduationDateInput.value : '';
        const juniorHighHonors = juniorHighHonorsInput ? juniorHighHonorsInput.value.trim() : '';
        const seniorHighHonors = seniorHighHonorsInput ? seniorHighHonorsInput.value.trim() : '';
        const remarks = remarksInput ? remarksInput.value : '';
        const notes = notesInput ? notesInput.value.trim() : '';

       
        const currentStudentId = studentIdInput ? studentIdInput.value : null;

        
        const enrollmentHistory = {};
        if (enrollmentFieldsContainer) {
            document.querySelectorAll('#enrollment-fields .enrollment-record').forEach((record, index) => {
                 
                 if (!record.classList.contains('readonly-entry')) {
                    
                    const schoolYearInput = record.querySelector('.school-year');
                    const enrollmentDateInput = record.querySelector('.enrollment-date');
                    const schoolYear = schoolYearInput ? schoolYearInput.value.trim() : '';
                    const enrollmentDate = enrollmentDateInput ? enrollmentDateInput.value : '';
                     
                     if (schoolYear && enrollmentDate) {
                         enrollmentHistory[`enrollment_${index}`] = { schoolYear, enrollmentDate };
                     }
                 } else {
                     
                     const originalDataInput = record.querySelector('.original-enrollment-data');
                     if(originalDataInput && originalDataInput.value){
                         try {
                             const originalData = JSON.parse(originalDataInput.value);
                             enrollmentHistory[`enrollment_${index}`] = originalData;
                         } catch (e) {
                             console.error("Failed to parse original enrollment data for read-only entry during form submission:", e);
                            
                         }
                     }
                 }
            });
        }

        const misconductInstances = {};
        if (misconductFieldsContainer) {
            document.querySelectorAll('#misconduct-fields .misconduct-instance').forEach((instance, index) => {
                
                 if (!instance.classList.contains('readonly-entry')) {
                   
                    const reasonInput = instance.querySelector('.misconduct-reason');
                    const dateInput = instance.querySelector('.misconduct-date');
                    const personsInput = instance.querySelector('.misconduct-persons');
                    const reason = reasonInput ? reasonInput.value.trim() : '';
                    const date = dateInput ? dateInput.value : '';
                    const personsInvolved = personsInput ? personsInput.value.trim() : '';
                    
                     if (reason) {
                         misconductInstances[`misconduct_${index}`] = { reason, date: date || null, personsInvolved: personsInvolved || null };
                     }
                 } else {
                      
                     const originalDataInput = instance.querySelector('.original-misconduct-data');
                     if(originalDataInput && originalDataInput.value){
                         try {
                             const originalData = JSON.parse(originalDataInput.value);
                             misconductInstances[`misconduct_${index}`] = originalData;
                         } catch (e) {
                             console.error("Failed to parse original misconduct data for read-only entry during form submission:", e);
                             
                         }
                     }
                 }
            });
        }

        const schoolRecordReleases = {};
        if (schoolRecordReleaseFieldsContainer) {
             document.querySelectorAll('#school-record-release-fields .school-record-release-entry').forEach((entry, index) => {
                 
                 if (!entry.classList.contains('readonly-entry')) {
                    
                    const releaseDateInput = entry.querySelector('.release-date');
                    const releaseReasonTextarea = entry.querySelector('.release-reason');
                    const transferSchoolInput = entry.querySelector('.transfer-school');

                    const releaseDate = releaseDateInput ? releaseDateInput.value : '';
                    const releaseReason = releaseReasonTextarea ? releaseReasonTextarea.value.trim() : '';
                    const transferSchool = transferSchoolInput ? transferSchoolInput.value.trim() : '';

                    
                     if (releaseDate && (releaseReason || transferSchool)) {
                         schoolRecordReleases[`release_${index}`] = {
                             releaseDate,
                             releaseReason: releaseReason || null,
                             transferSchool: transferSchool || null
                         };
                     }
                 } else {
                    
                     const originalReleaseDataInput = entry.querySelector('input[type="hidden"].original-release-data');
                     if (originalReleaseDataInput && originalReleaseDataInput.value) {
                         try {
                             const originalData = JSON.parse(originalReleaseDataInput.value);
                              schoolRecordReleases[`release_${index}`] = {
                                 releaseDate: originalData.releaseDate || null,
                                 releaseReason: originalData.releaseReason || null,
                                 transferSchool: originalData.transferSchool || null
                             };
                         } catch (e) {
                             console.error("Failed to parse original release data for read-only entry during form submission:", e);
                             
                         }
                     }
                 }
             });
        }
        


       
        const newStudent = {
            lrn, 
            firstName, 
            lastName,
            middleName: middleName || null, 
            sex, 
            contact: contact || null, 
            address, 
            dob, 
            parents, 
            guardian: guardian || null, 
            religion: religion || null, 
            fourPs, 
            club: club || null, 
            learningModality, 
            
            enrollmentHistory: Object.keys(enrollmentHistory).length > 0 ? enrollmentHistory : null,
            misconductInstances: Object.keys(misconductInstances).length > 0 ? misconductInstances : null,
            schoolRecordReleases: Object.keys(schoolRecordReleases).length > 0 ? schoolRecordReleases : null,
            juniorHighGraduationDate: juniorHighGraduationDate || null, 
            seniorHighGraduationDate: seniorHighGraduationDate || null, 
            juniorHighHonors: juniorHighHonors || null, 
            seniorHighHonors: seniorHighHonors || null, 
            remarks: remarks || null,
            notes: notes || null 
        };

        
        if (!lrn || !firstName || !lastName || !sex || !address || !dob || !parents || !learningModality) {
            errorMessage.textContent = "Please fill in all mandatory fields (LRN, First Name, Last Name, Sex, Address, Date of Birth, Parents, Learning Modality).";
            if (errorMessage) {
                errorMessage.style.display = 'block';
                setTimeout(() => { if(errorMessage) errorMessage.style.display = 'none'; }, 5000); 
            }
            return; 
        }

        
        if (!currentStudentId) {
            const isDuplicate = allStudentsData.some(studentData => studentData.val().lrn === lrn);
            if (isDuplicate) {
                errorMessage.textContent = `LRN "${lrn}" already exists. Please enter a unique LRN.`;
                if (errorMessage) {
                    errorMessage.style.display = 'block';
                    setTimeout(() => { if(errorMessage) errorMessage.style.display = 'none'; }, 3000); 
                }
                return;
            }
        }

        console.log("Data to be saved:", newStudent);

       
        saveStudentData(newStudent, currentStudentId).then(() => {
            
            console.log("Save operation promise resolved.");
            clearForm(); 
            if (addRecordModal) addRecordModal.style.display = 'none'; 

           
            confirmationMessage.textContent = currentStudentId ? "Student data updated successfully!" : "New student data saved successfully!";
            if (confirmationMessage) {
                confirmationMessage.style.display = 'block';
                setTimeout(() => {
                    if(confirmationMessage) confirmationMessage.style.display = 'none';
                }, 3000); 
            }
        }).catch(error => {
             
             console.error("Save operation promise rejected:", error);
             if (addRecordModal) addRecordModal.style.display = 'none'; 
        });
    });
} else {
    console.error("Error: Could not find the 'add-student-form' element in the HTML.");
}



function editStudent(studentId) {
  
    if (!studentIdInput || !studentFormHeader || !addRecordModal || !enrollmentFieldsContainer || !misconductFieldsContainer || !schoolRecordReleaseFieldsContainer || !notesInput || !juniorHighGraduationDateInput || !seniorHighGraduationDateInput || !juniorHighHonorsInput || !seniorHighHonorsInput || !remarksInput || !lrnInput || !firstNameInput || !lastNameInput || !sexInput || !addressInput || !dobInput || !parentsInput || !learningModalityInput) {
         console.error("Required elements for editing student not found. Cannot open edit form.");
         
         errorMessage.textContent = "An error occurred while preparing the edit form.";
         if(errorMessage) errorMessage.display = 'block';
         setTimeout(() => { if(errorMessage) errorMessage.style.display = 'none'; }, 3000);
         return; 
    }


    studentIdInput.value = studentId;

    studentFormHeader.textContent = 'Edit Student';
    if (lrnInput) lrnInput.disabled = true;


    addRecordModal.style.display = 'block';

 
    if (enrollmentFieldsContainer) enrollmentFieldsContainer.innerHTML = '';
    enrollmentCounter = 0;
    if (misconductFieldsContainer) misconductFieldsContainer.innerHTML = '';
    misconductCounter = 0;
    if (schoolRecordReleaseFieldsContainer) schoolRecordReleaseFieldsContainer.innerHTML = '';
    schoolRecordReleaseCounter = 0;

    
    studentsRef.child(studentId).get().then((snapshot) => {
        if (snapshot.exists()) {
            const student = snapshot.val(); 
            
            if (lrnInput) lrnInput.value = student.lrn || '';
            if (firstNameInput) firstNameInput.value = student.firstName || '';
            if (lastNameInput) lastNameInput.value = student.lastName || '';
            if (middleNameInput) middleNameInput.value = student.middleName || '';
            if (sexInput) sexInput.value = student.sex || '';
            if (contactInput) contactInput.value = student.contact || '';
            if (addressInput) addressInput.value = student.address || '';
            if (dobInput) dobInput.value = student.dob || '';
            if (parentsInput) parentsInput.value = student.parents || '';
            if (guardianInput) guardianInput.value = student.guardian || '';
            if (religionInput) religionInput.value = student.religion || '';
            if (fourPsInput) fourPsInput.checked = student.fourPs || false;
            if (clubInput) clubInput.value = student.club || '';
            if (learningModalityInput) learningModalityInput.value = student.learningModality || '';
            if (juniorHighGraduationDateInput) juniorHighGraduationDateInput.value = student.juniorHighGraduationDate || '';
            if (seniorHighGraduationDateInput) seniorHighGraduationDateInput.value = student.seniorHighGraduationDate || '';
            if (juniorHighHonorsInput) juniorHighHonorsInput.value = student.juniorHighHonors || '';
            if (seniorHighHonorsInput) seniorHighHonorsInput.value = student.seniorHighHonors || '';
            if (remarksInput) remarksInput.value = student.remarks || '';
            if (notesInput) notesInput.value = student.notes || '';

            

            
            if (student.enrollmentHistory) {
                
                 const enrollmentEntries = Object.keys(student.enrollmentHistory)
                     .sort((a, b) => {
                          const indexA = parseInt(a.split('_')[1]);
                          const indexB = parseInt(b.split('_')[1]);
                          return isNaN(indexA) || isNaN(indexB) ? 0 : indexA - indexB;
                     })
                     .map(key => student.enrollmentHistory[key]);

                enrollmentEntries.forEach(enrollment => {
                   
                    addEnrollment(enrollment.schoolYear, enrollment.enrollmentDate, true);
                });
            }
            
            addEnrollment();


            
            if (student.misconductInstances) {
                 
                 const misconductEntries = Object.keys(student.misconductInstances)
                     .sort((a, b) => {
                         const indexA = parseInt(a.split('_')[1]);
                         const indexB = parseInt(b.split('_')[1]);
                         return isNaN(indexA) || isNaN(indexB) ? 0 : indexA - indexB;
                     })
                     .map(key => student.misconductInstances[key]);

                misconductEntries.forEach(misconduct => {
                   
                    addMisconduct(misconduct.reason, misconduct.date, misconduct.personsInvolved, true);
                });
            }
           
            addMisconduct();


            
            if (student.schoolRecordReleases) {
               
                const releaseEntries = Object.keys(student.schoolRecordReleases)
                                         .sort((a, b) => {
                                              const indexA = parseInt(a.split('_')[1]);
                                              const indexB = parseInt(b.split('_')[1]);
                                              return isNaN(indexA) || isNaN(indexB) ? 0 : indexA - indexB;
                                         })
                                         .map(key => student.schoolRecordReleases[key]);

                 releaseEntries.forEach(release => {
                     
                     addSchoolRecordRelease(release.releaseDate, release.releaseReason, release.transferSchool, true);
                 });
            }
            
             addSchoolRecordRelease();

          

        } else {
            
             errorMessage.textContent = "No data found for this student.";
             if(errorMessage) errorMessage.style.display = 'block';
             setTimeout(() => {
                  if(errorMessage) errorMessage.style.display = 'none';
             }, 3000);
             clearForm(); 
        }
    }).catch((error) => {
        
         errorMessage.textContent = "Failed to retrieve student data for editing.";
         if(errorMessage) errorMessage.style.display = 'block';
         setTimeout(() => {
              if(errorMessage) errorMessage.style.display = 'none';
         }, 3000);
         console.error("Error fetching student data for edit:", error);
         clearForm(); 
    });
}


function viewStudent(studentId) {
    currentViewingStudentId = studentId; 
     
     if (!viewModal || !viewStudentName || !viewStudentDetails) {
         console.error("Required elements for viewing student not found.");
        
          errorMessage.textContent = "An error occurred while preparing to view student data.";
          if(errorMessage) errorMessage.style.display = 'block';
          setTimeout(() => { if(errorMessage) errorMessage.style.display = 'none'; }, 3000);
         return; 
     }

    
    studentsRef.child(studentId).get().then((studentSnapshot) => {
        if (studentSnapshot.exists()) {
            const student = studentSnapshot.val(); 

            
            viewStudentName.textContent = `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim();

            
            let detailsHTML = `
                <p><strong>LRN:</strong> ${student.lrn || 'N/A'}</p>
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
                    ${student.enrollmentHistory ? Object.values(student.enrollmentHistory).map(enrollment => `<li><strong>School Year:</strong> ${enrollment.schoolYear || 'N/A'}, <strong>Date:</strong> ${enrollment.enrollmentDate || 'N/A'}</li>`).join('') : '<li>No enrollment history</li>'}
                </ul>

                <p><strong>Misconduct Instances:</strong></p>
                <ul>
                    ${student.misconductInstances ? Object.values(student.misconductInstances).map(misconduct => `<li><strong>Reason:</strong> ${misconduct.reason || 'N/A'}, <strong>Date:</strong> ${misconduct.date || 'N/A'}, <strong>Persons Involved:</strong> ${misconduct.personsInvolved || 'N/A'}</li>`).join('') : '<li>No misconduct instances</li>'}
                </ul>

                <p><strong>School Record Release History (${student.schoolRecordReleases ? Object.keys(student.schoolRecordReleases).length : 0} releases):</strong></p>
                <ul>
                    ${student.schoolRecordReleases ? Object.values(student.schoolRecordReleases).map(release => `<li><strong>Date:</strong> ${release.releaseDate || 'N/A'}, <strong>Reason:</strong> ${release.releaseReason || 'N/A'}, <strong>Transfer School:</strong> ${release.transferSchool || 'N/A'}</li>`).join('') : '<li>No school record release history</li>'}
                </ul>

                 <p><strong>Notes:</strong> ${student.notes || 'N/A'}</p> <button type="button" onclick="showHistory('${studentId}')">View Modification History</button>
            `;
            
            viewStudentDetails.innerHTML = detailsHTML;
            
            viewModal.style.display = "block";
        } else {
            
             errorMessage.textContent = "No data found for this student.";
             if(errorMessage) errorMessage.style.display = 'block';
             setTimeout(() => {
                  if(errorMessage) errorMessage.style.display = 'none';
             }, 3000);
        }
    }).catch((error) => {
        
         errorMessage.textContent = "Failed to retrieve student data.";
         if(errorMessage) errorMessage.style.display = 'block';
         setTimeout(() => {
              if(errorMessage) errorMessage.style.display = 'none';
         }, 3000);
         console.error("Error fetching student data for view:", error);
    });
}

const formatHistoryComplexField = (key, value) => {
    
    if (isEffectivelyEmpty(value)) {
        return '<em>Empty/N/A</em>';
    }

    let html = '<ul style="margin: 0; padding-left: 20px;">'; 

    
    const entries = typeof value === 'object' && value !== null ? Object.keys(value).map(k => value[k]) : [];

     
     if (entries.length === 0 && (typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
          return '<em>Empty/N/A</em>';
     }


   
    if (key === 'enrollmentHistory') {
        entries.forEach(entry => {
            html += `<li><strong>School Year:</strong> ${entry.schoolYear || 'N/A'}, <strong>Date:</strong> ${entry.enrollmentDate || 'N/A'}</li>`;
        });
    } else if (key === 'misconductInstances') {
        entries.forEach(entry => {
            html += `<li><strong>Reason:</strong> ${entry.reason || 'N/A'}, <strong>Date:</strong> ${entry.date || 'N/A'}, <strong>Persons Involved:</strong> ${entry.personsInvolved || 'N/A'}</li>`;
        });
    } else if (key === 'schoolRecordReleases') {
        entries.forEach(entry => {
            html += `<li><strong>Date:</strong> ${entry.releaseDate || 'N/A'}, <strong>Reason:</strong> ${entry.releaseReason || 'N/A'}, <strong>Transfer School:</strong> ${entry.transferSchool || 'N/A'}</li>`;
        });
    } else {

        html += `<li>${JSON.stringify(value)}</li>`;
    }
    html += '</ul>'; 
    return html;
};



function showHistory(studentId) {
    
    const historyModal = document.getElementById('history-modal');
    const historyDetails = document.getElementById('history-details');
    if (!historyModal || !historyDetails) {
        console.error("Error: history-modal or history-details element not found. Cannot show history.");
        
        return; 
    }

    
    historyDetails.innerHTML = '';

    
    Promise.all([
        studentsRef.child(studentId).child('history').orderByChild('timestamp').get(), 
        studentsRef.child(studentId).child('creationDetails').get() 
    ]).then(([historySnapshot, creationSnapshot]) => {

        
        if (creationSnapshot.exists() && creationSnapshot.val()) {
            const creationDetails = creationSnapshot.val();
            const creationDate = new Date(creationDetails.timestamp).toLocaleString();
            const createdByEmail = creationDetails.createdByEmail || 'Unknown User';
            const creationEntryDiv = document.createElement('div');
            creationEntryDiv.classList.add('history-entry'); 
            creationEntryDiv.innerHTML = `<h4>Student Record Creation</h4><p><strong>Date:</strong> ${creationDate}</p><p><strong>Created By:</strong> ${createdByEmail}</p><hr>`;
            historyDetails.appendChild(creationEntryDiv);
        }

        
        if (historySnapshot.exists() && historySnapshot.val()) {
            const historyData = historySnapshot.val();
            
            const entries = Object.values(historyData);

            
            entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            
            entries.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.classList.add('history-entry'); 
                const formattedTime = new Date(entry.timestamp).toLocaleString();
                const modifiedByDisplayName = entry.modifiedByUserDisplayName || 'Unknown User';

                let changesHTML = '<p><strong>Changes:</strong></p><ul>';
                let hasChangesForDisplay = false; 

                
                for (const key in entry.changes) {
                    console.log(`[HISTORY] Checking change for key: ${key}`);
                    
                    if (entry.changes.hasOwnProperty(key)) {
                        const change = entry.changes[key];

                        
                        let valuesAreEffectivelyDifferent = true; 

                        if (['enrollmentHistory', 'misconductInstances', 'schoolRecordReleases'].includes(key)) {
                             
                             if (isEffectivelyEmpty(change.oldValue) && isEffectivelyEmpty(change.newValue)) {
                                 valuesAreEffectivelyDifferent = false;
                             }
                             
                        } else if (key === 'fourPs') {
                             
                             valuesAreEffectivelyDifferent = (change.oldValue === true) !== (change.newValue === true);
                        }
                        else {
                           
                            valuesAreEffectivelyDifferent = change.oldValue !== change.newValue;
                        }

                        
                        if (valuesAreEffectivelyDifferent) {
                            hasChangesForDisplay = true; 

                            changesHTML += `<li>
                                <strong>${key}:</strong><br>
                                <span style="font-weight: bold;">Previous Data:</span> `; 

                           
                            if (['enrollmentHistory', 'misconductInstances', 'schoolRecordReleases'].includes(key)) {
                                changesHTML += formatHistoryComplexField(key, change.oldValue);
                            } else if (key === 'fourPs') {
                                changesHTML += (change.oldValue === true ? 'Yes' : 'No');
                            }
                             else {
                                changesHTML += isEffectivelyEmpty(change.oldValue) ? '<em>Empty/N/A</em>' : String(change.oldValue);
                            }

                            changesHTML += `<br><span style="font-weight: bold;">Present Data:</span> `; 

                            
                            if (['enrollmentHistory', 'misconductInstances', 'schoolRecordReleases'].includes(key)) {
                                changesHTML += formatHistoryComplexField(key, change.newValue);
                            } else if (key === 'fourPs') {
                                changesHTML += (change.newValue === true ? 'Yes' : 'No');
                            }
                            else {
                                changesHTML += isEffectivelyEmpty(change.newValue) ? '<em>Empty/N/A</em>' : String(change.newValue);
                            }
                            changesHTML += '</li>'; 
                        } else {
                            console.log(`[HISTORY] Values for key "${key}" are effectively the same (${JSON.stringify(change.oldValue)} vs ${JSON.stringify(change.newValue)}). Not displaying change.`);
                        }
                        
                    }
                }
                changesHTML += '</ul>'; 

               
                if (hasChangesForDisplay) {
                    entryDiv.innerHTML += `<h4>Modified At: ${formattedTime}</h4><p><strong>Modified By:</strong> ${modifiedByDisplayName}</p>${changesHTML}<hr>`;
                    historyDetails.appendChild(entryDiv);
                } else {
                     console.log(`[HISTORY] No displayable changes for entry at ${formattedTime}. Skipping display of this entry.`);
                }
            });
        }

        
        if (historyDetails.children.length === 0) {
            historyDetails.textContent = "No history available for this student.";
        }

       
        historyModal.style.display = 'block';

    }).catch(error => {
       
         console.error("Failed to load modification history:", error);
         historyDetails.textContent = "Failed to load modification history.";
         if (historyModal) historyModal.style.display = 'block'; 
    });
}



if (searchInput) {
    searchInput.addEventListener('input', function() {
        const searchTerm = searchInput.value.toLowerCase().trim(); 

        
        if (searchTerm === "") {
             renderStudents([]); 
        } else {
            
            const results = allStudentsData.filter(studentData => {
                const student = studentData.val(); 

                
                const searchTermLower = searchTerm.toLowerCase(); 
                return (student && student.lrn && String(student.lrn).toLowerCase().startsWith(searchTermLower)) ||
                       (student && student.firstName && student.firstName.toLowerCase().startsWith(searchTermLower)) ||
                       (student && student.lastName && student.lastName.toLowerCase().startsWith(searchTermLower));
            });
            
            renderStudents(results);
        }
    });
}



function addEnrollment(schoolYear = `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`, enrollmentDate = '', isReadOnly = false) {
    enrollmentCounter++; 
    const enrollmentDiv = document.createElement('div');
    enrollmentDiv.classList.add('enrollment-record'); 
     if (isReadOnly) {
         enrollmentDiv.classList.add('readonly-entry'); 
         
         const originalData = { schoolYear, enrollmentDate };
          enrollmentDiv.innerHTML += `<input type="hidden" class="original-enrollment-data" value='${JSON.stringify(originalData)}'>`;
     }

    enrollmentDiv.innerHTML += `
        <h3>Enrollment ${enrollmentCounter}</h3>
        <div>
            <label for="schoolYear_${enrollmentCounter}">School Year:</label>
            <input type="text" class="school-year" id="schoolYear_${enrollmentCounter}" value="${schoolYear}" ${isReadOnly ? 'readonly' : ''}>
        </div>
        <div>
            <label for="enrollmentDate_${enrollmentCounter}">Enrollment Date:</label>
            <input type="date" class="enrollment-date" id="enrollmentDate_${enrollmentCounter}" value="${enrollmentDate}" ${isReadOnly ? 'disabled' : ''}>
        </div>
        ${isReadOnly ? '' : '<button type="button" class="remove-btn" onclick="removeEnrollment(this)">Remove</button>'} `;

    
    if (enrollmentFieldsContainer) {
        enrollmentFieldsContainer.appendChild(enrollmentDiv);
    } else {
        console.error("Enrollment fields container not found. Cannot add enrollment.");
    }
}


function removeEnrollment(button) {
     
     const entryDiv = button ? button.closest('.enrollment-record') : null;
    
     if (entryDiv && !entryDiv.classList.contains('readonly-entry')) {
         entryDiv.remove(); 
     } else if (entryDiv) {
         console.warn("Attempted to remove a read-only enrollment entry.");
         
     }
}



function addMisconduct(reason = '', date = '', personsInvolved = '', isReadOnly = false) {
    misconductCounter++; 
    const misconductDiv = document.createElement('div');
    misconductDiv.classList.add('misconduct-instance'); 
     if (isReadOnly) {
         misconductDiv.classList.add('readonly-entry'); 
        
         const originalData = { reason, date, personsInvolved };
          misconductDiv.innerHTML += `<input type="hidden" class="original-misconduct-data" value='${JSON.stringify(originalData)}'>`;
     }

    misconductDiv.innerHTML += `
        <h3>Misconduct Instance ${misconductCounter}</h3>
        <div>
            <label for="misconductReason_${misconductCounter}">Reason:</label>
            <textarea class="misconduct-reason" id="misconductReason_${misconductCounter}" ${isReadOnly ? 'readonly' : ''}>${reason}</textarea>
        </div>
        <div>
            <label for="misconductDate_${misconductCounter}">Date:</label>
            <input type="date" class="misconduct-date" id="misconductDate_${misconductCounter}" value="${date}" ${isReadOnly ? 'disabled' : ''}>
        </div>
        <div>
            <label for="misconductPersons_${misconductCounter}">Persons Involved:</label>
            <input type="text" class="misconduct-persons" id="misconductPersons_${misconductCounter}" value="${personsInvolved}" ${isReadOnly ? 'readonly' : ''}>
        </div>
        ${isReadOnly ? '' : '<button type="button" class="remove-btn" onclick="removeMisconduct(this)">Remove</button>'} `;

    
    if (misconductFieldsContainer) {
        misconductFieldsContainer.appendChild(misconductDiv);
    } else {
        console.error("Misconduct fields container not found. Cannot add misconduct instance.");
    }
}



function removeMisconduct(button) {
    
     const entryDiv = button ? button.closest('.misconduct-instance') : null;
     
     if (entryDiv && !entryDiv.classList.contains('readonly-entry')) {
         entryDiv.remove(); 
     } else if (entryDiv) {
         console.warn("Attempted to remove a read-only misconduct entry.");
         
     }
}


function addSchoolRecordRelease(releaseDate = '', releaseReason = '', transferSchool = '', isReadOnly = false) {
    schoolRecordReleaseCounter++; 
    const releaseDiv = document.createElement('div');
    releaseDiv.classList.add('school-record-release-entry'); 

    if (isReadOnly) {
        releaseDiv.classList.add('readonly-entry'); 
        
        const originalData = { releaseDate, releaseReason, transferSchool };
         releaseDiv.innerHTML += `<input type="hidden" class="original-release-data" value='${JSON.stringify(originalData)}'>`;
    }

    releaseDiv.innerHTML += `
        <h3>School Record Release ${schoolRecordReleaseCounter}</h3>
        <div>
            <label for="releaseDate_${schoolRecordReleaseCounter}">Release Date:</label>
            <input type="date" class="release-date" id="releaseDate_${schoolRecordReleaseCounter}" value="${releaseDate}" ${isReadOnly ? 'disabled' : ''}>
        </div>
        <div>
            <label for="releaseReason_${schoolRecordReleaseCounter}">Reason for Release:</label>
            <textarea class="release-reason" id="releaseReason_${schoolRecordReleaseCounter}" ${isReadOnly ? 'readonly' : ''}>${releaseReason}</textarea>
        </div>
        <div>
            <label for="transferSchool_${schoolRecordReleaseCounter}">Transferring School:</label>
            <input type="text" class="transfer-school" id="transferSchool_${schoolRecordReleaseCounter}" value="${transferSchool}" ${isReadOnly ? 'readonly' : ''}>
        </div>
        ${isReadOnly ? '' : '<button type="button" class="remove-btn" onclick="removeSchoolRecordRelease(this)">Remove</button>'} `;

    
    if (schoolRecordReleaseFieldsContainer) {
        schoolRecordReleaseFieldsContainer.appendChild(releaseDiv);
      
         if (!isReadOnly && !releaseDate) {
              const dateInput = releaseDiv.querySelector('.release-date');
              if(dateInput) dateInput.valueAsDate = new Date();
         }
    } else {
        console.error("School record release fields container not found. Cannot add release entry.");
    }
}


function removeSchoolRecordRelease(button) {
    
    const entryDiv = button ? button.closest('.school-record-release-entry') : null;
   
    if (entryDiv && !entryDiv.classList.contains('readonly-entry')) {
        entryDiv.remove(); 
    } else if (entryDiv) {
        console.warn("Attempted to remove a read-only school record release entry.");
       
    }
}



function clearForm() {

    if (addStudentForm) {
        addStudentForm.reset();
    }


    if (enrollmentFieldsContainer) enrollmentFieldsContainer.innerHTML = '';
    if (misconductFieldsContainer) misconductFieldsContainer.innerHTML = '';
    if (schoolRecordReleaseFieldsContainer) schoolRecordReleaseFieldsContainer.innerHTML = ''; 

 
    enrollmentCounter = 0;
    misconductCounter = 0;
    schoolRecordReleaseCounter = 0;


    if (studentIdInput) studentIdInput.value = '';
    if (lrnInput) lrnInput.disabled = false; 

    if (studentFormHeader) studentFormHeader.textContent = 'Add New Student / Edit Student';


    if (notesInput) notesInput.value = '';
    if (juniorHighGraduationDateInput) juniorHighGraduationDateInput.value = '';
    if (seniorHighGraduationDateInput) seniorHighGraduationDateInput.value = '';
    if (juniorHighHonorsInput) juniorHighHonorsInput.value = '';
    if (seniorHighHonorsInput) seniorHighHonorsInput.value = '';
    if (remarksInput) remarksInput.value = '';


    addEnrollment();
    addMisconduct();
    addSchoolRecordRelease();
}



if (closeAddRecordModalButton) {
    closeAddRecordModalButton.addEventListener('click', () => {
        if (addRecordModal) addRecordModal.style.display = 'none';
        clearForm();
    });
}
if (closeViewModalButton) {
    closeViewModalButton.addEventListener('click', function() {
        if (viewModal) viewModal.style.display = "none"; 
    });
}
if (closeHistoryModalButton) {
    closeHistoryModalButton.addEventListener('click', function() {
        if (historyModal) historyModal.style.display = "none"; 
    });
}
if (closeBulkAddModalButton) {
    closeBulkAddModalButton.addEventListener('click', () => {
        if (bulkAddModal) bulkAddModal.style.display = 'none';
        if (bulkAddFormsContainer) bulkAddFormsContainer.innerHTML = '';
    });
}


window.addEventListener('click', (event) => {
    if (addRecordModal && event.target == addRecordModal) {
        addRecordModal.style.display = 'none';
        clearForm(); 
    }
    if (viewModal && event.target == viewModal) {
        viewModal.style.display = "none";
    }
    if (historyModal && event.target == historyModal) {
        historyModal.style.display = "none";
    }
    if (bulkAddModal && event.target == bulkAddModal) {
        bulkAddModal.style.display = 'none';
        if (bulkAddFormsContainer) bulkAddFormsContainer.innerHTML = '';
    }
});



if (addRecordButton) {
    addRecordButton.addEventListener('click', () => {
        if (addRecordModal) addRecordModal.style.display = 'block'; 
        if (studentFormHeader) studentFormHeader.textContent = 'Add New Student'; 
        if (studentIdInput) studentIdInput.value = ''; 
        if (lrnInput) lrnInput.disabled = false;
        clearForm();
    });
}


studentsRef.on('value', (snapshot) => {
    const studentData = []; 
    
    snapshot.forEach((childSnapshot) => {
        studentData.push(childSnapshot);
    });
    allStudentsData = studentData; 
    console.log(`[FIREBASE] Fetched ${allStudentsData.length} student records.`);

   
    const currentSearchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    if (currentSearchTerm === "") {
        
        renderStudents([]);
    } else {
   
         const results = allStudentsData.filter(studentData => {
             const student = studentData.val(); 
             const searchTermLower = currentSearchTerm.toLowerCase(); 

                    return (student && student.lrn && String(student.lrn).toLowerCase().startsWith(searchTermLower)) ||
                    (student && student.firstName && student.firstName.toLowerCase().startsWith(searchTermLower)) ||
                    (student && student.lastName && student.lastName.toLowerCase().startsWith(searchTermLower));
         });
        renderStudents(results);
    }
});


hideInstallButtonIfInstalled();


if (lrnInput) {
    lrnInput.addEventListener('keypress', function(event) {
        const charCode = (event.which) ? event.which : event.keyCode;
        
        if (charCode > 31 && (charCode < 48 || charCode > 57)) {
            event.preventDefault();
        }
    });

    lrnInput.addEventListener('input', function() {
        
        if (this.value.length > 12) {
            this.value = this.value.slice(0, 12);
        }
    });
}


if (contactInput) {
    contactInput.addEventListener('keypress', function(event) {
        const charCode = (event.which) ? event.which : event.keyCode;
        
        if (charCode > 31 && (charCode < 48 || charCode > 57)) {
            event.preventDefault(); 
        }
    });

}


if (bulkAddButton) {
    bulkAddButton.addEventListener('click', () => {
        if (bulkAddModal) {
            bulkAddModal.style.display = 'block';
            if (bulkAddFormsContainer) bulkAddFormsContainer.innerHTML = ''; 
            createBulkStudentRecordFields(0); 
        } else {
            console.error("Bulk add modal element not found.");
            
        }
    });
}



if (addBulkRecordButton) {
    addBulkRecordButton.addEventListener('click', () => {
        if (bulkAddFormsContainer) {
            
            const recordCount = bulkAddFormsContainer.children.length;
            createBulkStudentRecordFields(recordCount); 
        } else {
            console.error("Bulk add forms container not found. Cannot add bulk record fields.");
             
        }
    });
}



function removeBulkStudentRecord(button) {
   
    const recordDiv = button ? button.closest('.bulk-student-record') : null;
    
    if (recordDiv && bulkAddFormsContainer && bulkAddFormsContainer.contains(recordDiv)) {
        bulkAddFormsContainer.removeChild(recordDiv); 

        const recordDivs = bulkAddFormsContainer.querySelectorAll('.bulk-student-record');
        recordDivs.forEach((div, index) => {
            const h3 = div.querySelector('h3');
            if (h3) {
                h3.textContent = `Student Record #${index + 1}`; 

                
                const inputs = div.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    const oldId = input.id;
                    if(oldId && oldId.includes('_')) {
                        const parts = oldId.split('_');
                        parts[parts.length - 1] = index; 
                        input.id = parts.join('_');

                        
                        const label = div.querySelector(`label[for="${oldId}"]`);
                        if(label) {
                            label.setAttribute('for', input.id);
                        }
                    }
                });
            }
        });
    } else {
         console.error("Could not find the bulk student record element to remove.");
         
    }
}



function processBulkRecordsForm() {
    if (!bulkAddFormsContainer) {
        console.error("Bulk add forms container not found. Cannot process records.");
        
        return;
    }

    
    const studentRecords = bulkAddFormsContainer.querySelectorAll('.bulk-student-record');
    let recordsProcessedSuccessfully = 0; 
    let recordsFailedProcessing = 0; 
    let recordsFailedSaving = 0;
    const processingPromises = [];
    const processedLrnsInBatch = new Set(); 

        if (studentRecords.length === 0) {
        errorMessage.textContent = 'Please add at least one student record to process.';
        if (errorMessage) {
            errorMessage.style.display = 'block';
            setTimeout(() => { if(errorMessage) errorMessage.style.display = 'none'; }, 3000);
        }
        return;
    }

     const validRecordsToProcess = [];
     studentRecords.forEach((recordDiv, index) => {
         
         const lrnInput = recordDiv.querySelector(`#bulkLrn_${index}`);
         const firstNameInput = recordDiv.querySelector(`#bulkFirstName_${index}`);
         const lastNameInput = recordDiv.querySelector(`#bulkLastName_${index}`);
         const sexSelect = recordDiv.querySelector(`#bulkSex_${index}`);
         const addressTextarea = recordDiv.querySelector(`#bulkAddress_${index}`);
         const dobInput = recordDiv.querySelector(`#bulkDob_${index}`);
         const parentsInput = recordDiv.querySelector(`#bulkParents_${index}`);
         const learningModalitySelect = recordDiv.querySelector(`#bulkLearningModality_${index}`);

        
         const lrn = lrnInput ? lrnInput.value.trim() : '';
         const firstName = firstNameInput ? firstNameInput.value.trim() : '';
         const lastName = lastNameInput ? lastNameInput.value.trim() : '';
         const sex = sexSelect ? sexSelect.value : '';
         const address = addressTextarea ? addressTextarea.value.trim() : '';
         const dob = dobInput ? dobInput.value : '';
         const parents = parentsInput ? parentsInput.value.trim() : '';
         const learningModality = learningModalitySelect ? learningModalitySelect.value : '';


        
         if (!lrn || !firstName || !lastName || !sex || !address || !dob || !parents || !learningModality) {
             console.warn(`Bulk Add: Skipping record #${index + 1} due to missing mandatory fields.`);
             recordsFailedProcessing++;
             return;
         }

        
         if (processedLrnsInBatch.has(lrn)) {
             console.warn(`Bulk Add: Skipping record #${index + 1} with LRN "${lrn}" because it is a duplicate within the current batch.`);
             recordsFailedProcessing++;
             return; 
         }
         processedLrnsInBatch.add(lrn); 

         
          const isDuplicateInExisting = allStudentsData.some(studentData => {
              const student = studentData.val();
             
              return student && student.lrn && student.lrn === lrn;
          });
          if (isDuplicateInExisting) {
               console.warn(`Bulk Add: Skipping record #${index + 1} with LRN "${lrn}" because it already exists in the database.`);
               recordsFailedProcessing++;
               return; 
          }


         validRecordsToProcess.push({
             lrn: lrn,
             firstName: firstName,
             lastName: lastName,
             sex: sex,
             address: address,
             dob: dob,
             parents: parents,
             learningModality: learningModality,
            
         });
     });


         if (validRecordsToProcess.length === 0) {
         let message = `No records were successfully processed from the batch.`;
         if (recordsFailedProcessing > 0) {
              message += ` ${recordsFailedProcessing} record(s) skipped (missing mandatory fields or duplicates).`;
         }
         
         if (studentRecords.length > 0) {
              errorMessage.textContent = message;
               if (errorMessage) {
                   errorMessage.style.display = 'block';
                   setTimeout(() => { if(errorMessage) errorMessage.style.display = 'none'; }, 7000);
               }
         }
        
         if(bulkAddModal) bulkAddModal.style.display = 'none';
         if(bulkAddFormsContainer) bulkAddFormsContainer.innerHTML = '';
         return; 
     }



    validRecordsToProcess.forEach((record, index) => {
        
         processingPromises.push(
             saveStudentData(record) 
                 .then(() => {
                     recordsProcessedSuccessfully++; 
                 })
                 .catch((error) => {
                     
                     console.error(`Bulk Add: Error saving record with LRN "${record.lrn}":`, error);
                     recordsFailedSaving++; 
                     
                 })
         );
    });


    
    Promise.all(processingPromises)
        .then(() => {
             const totalRecordsAttempted = studentRecords.length; 
             const totalRecordsFailed = recordsFailedProcessing + recordsFailedSaving; 
             const totalRecordsSucceeded = recordsProcessedSuccessfully;

             let message = '';
             let messageType = 'confirmation'; 

             
             if (totalRecordsSucceeded > 0) {
                 message += `Successfully added ${totalRecordsSucceeded} record(s).`;
             }

             if (recordsFailedProcessing > 0) {
                 if (message !== '') message += ' '; 
                 message += `${recordsFailedProcessing} record(s) skipped (missing mandatory fields or duplicates).`;
                 
                 if (totalRecordsSucceeded > 0) {
                     messageType = 'confirmation'; 
                 } else {
                     messageType = 'error'; 
                 }
             }

             if (recordsFailedSaving > 0) {
                 if (message !== '') message += ' '; 
                 message += `${recordsFailedSaving} record(s) failed to save to Firebase.`;
                 messageType = 'error'; 
             }

             
             if (totalRecordsAttempted === 0) {
                 message = 'No records found in the bulk add form to process.';
                 messageType = 'error';
             } else if (totalRecordsSucceeded === 0 && totalRecordsFailed === 0) {
                
                  message = 'Processing completed, but no records were added (check console for details).';
                  messageType = 'error';
             }


             if (messageType === 'confirmation') {
                  if(confirmationMessage) {
                      confirmationMessage.textContent = message;
                      confirmationMessage.style.display = 'block';
                      setTimeout(() => { if(confirmationMessage) confirmationMessage.style.display = 'none'; }, 7000); 
                  }
             } else { 
                  if(errorMessage) {
                      errorMessage.textContent = message;
                      errorMessage.style.display = 'block';
                      setTimeout(() => { if(errorMessage) errorMessage.style.display = 'none'; }, 7000); 
                  }
             }

             
             if(bulkAddModal) bulkAddModal.style.display = 'none';
             if(bulkAddFormsContainer) bulkAddFormsContainer.innerHTML = '';
         });
}


function createBulkStudentRecordFields(recordIndex) {
    
    if (!bulkAddFormsContainer) {
        console.error("Bulk add forms container not found. Cannot create bulk record fields.");
        
        return;
    }
   
    const recordDiv = document.createElement('div');
    recordDiv.classList.add('bulk-student-record'); 

    recordDiv.style.border = '1px solid #ccc';
    recordDiv.style.padding = '15px';
    recordDiv.style.marginBottom = '10px';
    recordDiv.style.borderRadius = '8px';
    recordDiv.style.backgroundColor = '#f9f9f9'; 



    recordDiv.innerHTML = `
        <h3>Student Record #${recordIndex + 1}</h3> <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px;">
             <div>
                 <label for="bulkLrn_${recordIndex}">LRN:</label><br>
                 <input type="text" id="bulkLrn_${recordIndex}" maxlength="12" onkeypress="return event.charCode >= 48 && event.charCode <= 57" required style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
             </div>
             <div>
                 <label for="bulkFirstName_${recordIndex}">First Name:</label><br>
                 <input type="text" id="bulkFirstName_${recordIndex}" required style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
             </div>
             <div>
                 <label for="bulkLastName_${recordIndex}">Last Name:</label><br>
                 <input type="text" id="bulkLastName_${recordIndex}" required style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
             </div>
             <div>
                 <label for="bulkSex_${recordIndex}">Sex:</label><br>
                 <select id="bulkSex_${recordIndex}" required style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                     <option value="">-- Select Sex --</option>
                     <option value="Male">Male</option>
                     <option value="Female">Female</option>
                 </select>
             </div>
             <div style="grid-column: span 2;"> <label for="bulkAddress_${recordIndex}">Address:</label><br>
                 <textarea id="bulkAddress_${recordIndex}" required style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"></textarea>
             </div>
             <div>
                 <label for="bulkDob_${recordIndex}">Date of Birth:</label><br>
                 <input type="date" id="bulkDob_${recordIndex}" required style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
             </div>
             <div>
                 <label for="bulkParents_${recordIndex}">Parents (Full Name):</label><br>
                 <input type="text" id="bulkParents_${recordIndex}" required style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
             </div>
             <div>
                 <label for="bulkLearningModality_${recordIndex}">Learning Modality:</label><br>
                 <select id="bulkLearningModality_${recordIndex}" required style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                     <option value="">-- Select Modality --</option>
                     <option value="Face to Face">Face to Face</option>
                     <option value="Modular Print">Modular Print</option>
                     <option value="Online">Online</option>
                     <option value="ADM">ADM</option>
                 </select>
             </div>
         </div>
         <button type="button" class="remove-bulk-record" onclick="removeBulkStudentRecord(this)" style="background-color: #dc3545; color: white; padding: 8px 12px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-top: 15px;">Remove</button>
     `;

     
     if (bulkAddFormsContainer) {
         bulkAddFormsContainer.appendChild(recordDiv);

        
          const bulkLrnInput = recordDiv.querySelector(`#bulkLrn_${recordIndex}`);
          if (bulkLrnInput) {
               
               bulkLrnInput.addEventListener('keypress', function(event) {
                     const charCode = (event.which) ? event.which : event.keyCode;
                     if (charCode > 31 && (charCode < 48 || charCode > 57)) {
                          event.preventDefault(); 
                     }
                });
               
                bulkLrnInput.addEventListener('input', function() {
                    if (this.value.length > 12) {
                        this.value = this.value.slice(0, 12);
                    }
                });
          }
     } else {
         console.error("Bulk add forms container not found.");
         
     }
}
