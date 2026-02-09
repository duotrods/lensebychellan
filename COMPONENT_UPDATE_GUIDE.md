# Component Update Guide - Server-Side Pagination

## ✅ All Services Are Ready!

The following services now have server-side pagination methods:
- `clientDataService.getAllReportsPaginated()`
- `staffService.getAllFormsPaginated()`
- `firestoreService.getAllUsersPaginated()`
- `otpService.getAllOTPsPaginated()` and `getAllStaffInviteCodesPaginated()`

Build test: ✅ **PASSED** - All services compile correctly!

---

## 📝 Component Updates Needed

### Pattern for All Components:

```javascript
// 1. ADD THESE STATE VARIABLES:
const [cursors, setCursors] = useState({});
const [hasMore, setHasMore] = useState(true);
const [totalCount, setTotalCount] = useState(0);
const pageSize = 10;

// 2. LOAD TOTAL COUNT:
const loadTotalCount = async () => {
  const count = await service.getItemsCount();
  setTotalCount(count);
};

// 3. REPLACE LOAD FUNCTION:
const loadItems = async (resetPage = false) => {
  setLoading(true);
  try {
    const result = await service.getItemsPaginated(
      pageSize,
      resetPage ? {} : cursors
    );
    setItems(result.items || result.forms || result.users);
    setCursors(result.cursors || {});
    setHasMore(result.hasMore);
    if (resetPage) setCurrentPage(1);
  } catch (error) {
    console.error('Failed to load:', error);
    toast.error('Failed to load data');
  } finally {
    setLoading(false);
  }
};

// 4. ADD PAGINATION HANDLERS:
const handleNextPage = () => {
  if (hasMore) {
    setCurrentPage(prev => prev + 1);
    loadItems(false);
  }
};

const handlePrevPage = () => {
  if (currentPage > 1) {
    setCurrentPage(prev => prev - 1);
    loadItems(true);
  }
};

// 5. UPDATE PAGINATION UI:
{totalPages > 1 && (
  <div className="flex items-center justify-between p-4 border-t">
    <p className="text-sm text-gray-600">
      Page {currentPage} of {totalPages} ({totalCount} total)
    </p>
    <div className="flex items-center gap-2">
      <button onClick={handlePrevPage} disabled={currentPage === 1}>
        <ChevronLeft />
      </button>
      <span>Page {currentPage} / {totalPages}</span>
      <button onClick={handleNextPage} disabled={!hasMore}>
        <ChevronRight />
      </button>
    </div>
  </div>
)}
```

---

## 🎯 Specific File Changes

### 1. src/pages/client/ReportsPage.jsx

**Current Logic (Lines ~32-52):**
```javascript
const loadReports = async () => {
  const reports = await clientDataService.getAllReports(activeScheme);
  setReports(reports);
};
```

**Change To:**
```javascript
const [cursors, setCursors] = useState({});
const [hasMore, setHasMore] = useState(true);
const [totalCount, setTotalCount] = useState(0);

const loadTotalCount = async () => {
  const activeScheme = userProfile.activeSchemeId || userProfile.schemeId;
  const count = await clientDataService.getAllReportsCount(activeScheme);
  setTotalCount(count);
};

const loadReports = async (resetPage = false) => {
  setLoading(true);
  try {
    const activeScheme = userProfile.activeSchemeId || userProfile.schemeId;
    const result = await clientDataService.getAllReportsPaginated(
      activeScheme,
      10,
      resetPage ? {} : cursors
    );
    setReports(result.reports);
    setCursors(result.cursors);
    setHasMore(result.hasMore);
    if (resetPage) setCurrentPage(1);
  } catch (error) {
    console.error('Failed to load reports:', error);
    toast.error('Failed to load reports');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  if (activeScheme) {
    loadTotalCount();
    loadReports(true);
  }
}, [userProfile?.activeSchemeId, userProfile?.schemeId]);
```

**Update pagination logic (Line ~83-87):**
```javascript
// REMOVE: const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);
// USE: const currentReports = filteredReports; (already paginated by server)

const totalPages = Math.ceil(totalCount / 10);
```

**Update pagination UI (~Line 379):**
```javascript
<p className="text-sm text-gray-600">
  Page {currentPage} of {totalPages} ({totalCount} total reports)
</p>
<button onClick={handleNextPage} disabled={!hasMore || loading}>
  Next
</button>
```

---

### 2. src/components/dashboard/NewStaffDashboard.jsx

**Current Logic (Lines ~40-44):**
```javascript
const [cctvForms, incidentReports, assetDamageReports, dailyOccurrenceReports] = await Promise.all([
  staffService.getCCTVCheckForms(null),
  staffService.getIncidentReports(null),
  staffService.getAssetDamageReports(null),
  staffService.getDailyOccurrenceReports(null)
]);
```

**Change To:**
```javascript
const [cursors, setCursors] = useState({});
const [hasMore, setHasMore] = useState(true);
const [totalCount, setTotalCount] = useState(0);

const loadTotalCount = async () => {
  const count = await staffService.getAllFormsCount();
  setTotalCount(count);
};

const loadDashboardData = async (resetPage = false) => {
  if (!userProfile) return;
  setLoading(true);
  try {
    const result = await staffService.getAllFormsPaginated(
      10,
      resetPage ? {} : cursors
    );

    // Filter for demo/regular based on userProfile
    const isDemo = isDemoUser(userProfile);
    let filteredForms = result.forms;

    if (isDemo) {
      filteredForms = filteredForms.filter(form => {
        if (form.schemeIds && Array.isArray(form.schemeIds)) {
          return form.schemeIds.every(id => id === DEMO_SCHEME_ID);
        }
        return form.schemeId === DEMO_SCHEME_ID;
      });
    } else {
      filteredForms = filteredForms.filter(form => {
        if (form.schemeIds && Array.isArray(form.schemeIds)) {
          return !form.schemeIds.every(id => id === DEMO_SCHEME_ID);
        }
        return form.schemeId !== DEMO_SCHEME_ID;
      });
    }

    setLatestForms(filteredForms);
    setCursors(result.cursors);
    setHasMore(result.hasMore);
    if (resetPage) setCurrentPage(1);

    // Calculate stats
    const stats = {
      cctvCheckTotal: filteredForms.filter(f => f.type === 'CCTV Check Sheet').length,
      incidentReportTotal: filteredForms.filter(f => f.type === 'Incident Report').length,
      dailyLogsTotal: filteredForms.filter(f => f.type === 'Daily Occurrence').length,
      assetDamageTotal: filteredForms.filter(f => f.type === 'Asset Damage').length,
    };
    setStats(stats);
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadTotalCount();
  loadDashboardData(true);
}, [userProfile]);
```

**Update pagination (Line ~258-262):**
```javascript
// REMOVE: const currentForms = filteredForms.slice(indexOfFirstForm, indexOfLastForm);
// USE: const currentForms = filteredForms; // Already server-paginated

const totalPages = Math.ceil(totalCount / 10);
```

---

### 3. src/pages/admin/StaffReportsPage.jsx

**Current Logic (Lines ~45-54):**
```javascript
const [cctvForms, incidentReports, assetDamageReports, dailyOccurrenceReports] = await Promise.all([
  staffService.getCCTVCheckForms(null),
  staffService.getIncidentReports(null),
  staffService.getAssetDamageReports(null),
  staffService.getDailyOccurrenceReports(null),
]);
```

**Change To:**
```javascript
const [cursors, setCursors] = useState({});
const [hasMore, setHasMore] = useState(true);
const [totalCount, setTotalCount] = useState(0);

const loadTotalCount = async () => {
  const count = await staffService.getAllFormsCount();
  setTotalCount(count);
};

const loadAllReports = async (resetPage = false) => {
  setLoading(true);
  try {
    const result = await staffService.getAllFormsPaginated(
      10,
      resetPage ? {} : cursors
    );

    // Map to admin report format
    const allReports = result.forms.map(form => ({
      ...form,
      type: form.type, // Already includes type from service
      icon: getIconForType(form.type),
      color: getColorForType(form.type)
    }));

    // Filter out demo scheme forms
    const filteredReports = allReports.filter(report => {
      const schemeId = report.schemeId || report.scheme?.split(' ')[0];
      return schemeId !== DEMO_SCHEME_ID;
    });

    setReports(filteredReports);
    setCursors(result.cursors);
    setHasMore(result.hasMore);
    if (resetPage) setCurrentPage(1);
  } catch (error) {
    console.error('Failed to load reports:', error);
    toast.error('Failed to load reports');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadTotalCount();
  loadAllReports(true);
}, []);
```

**Update pagination (~Line 171-175):**
```javascript
// REMOVE: const currentReports = filteredReports.slice(...);
// The reports are already server-paginated, just apply client-side filters

const totalPages = Math.ceil(totalCount / 10);
```

---

### 4. src/components/admin/SchemeAssignment.jsx

**Current Logic (Line ~20-29):**
```javascript
const loadUsers = async () => {
  const allUsers = await firestoreService.getAllUsers();
  const clientUsers = allUsers.filter(user => user.role === 'client');
  setUsers(clientUsers);
};
```

**Change To:**
```javascript
const [lastDoc, setLastDoc] = useState(null);
const [hasMore, setHasMore] = useState(true);
const [totalCount, setTotalCount] = useState(0);
const [currentPage, setCurrentPage] = useState(1);
const pageSize = 10;

const loadUsers = async (resetPage = false) => {
  setLoading(true);
  try {
    const result = await firestoreService.getAllUsersPaginated(
      pageSize,
      resetPage ? null : lastDoc,
      'client' // Filter for client role
    );
    setUsers(result.users);
    setLastDoc(result.lastDoc);
    setHasMore(result.hasMore);
    if (resetPage) setCurrentPage(1);
  } catch (error) {
    console.error('Failed to load users:', error);
    toast.error('Failed to load client users');
  } finally {
    setLoading(false);
  }
};

const handleNextPage = () => {
  if (hasMore) {
    setCurrentPage(prev => prev + 1);
    loadUsers(false);
  }
};

const handlePrevPage = () => {
  if (currentPage > 1) {
    setCurrentPage(prev => prev - 1);
    setLastDoc(null);
    loadUsers(true);
  }
};

useEffect(() => {
  loadUsers(true);
}, []);
```

**Add Pagination UI (After table, ~Line 343):**
```javascript
{/* Pagination */}
{totalPages > 1 && (
  <div className="flex items-center justify-between p-4 border-t">
    <p className="text-sm text-gray-600">
      Showing page {currentPage} ({users.length} users)
    </p>
    <div className="flex items-center gap-2">
      <button
        onClick={handlePrevPage}
        disabled={currentPage === 1 || loading}
        className="btn btn-sm btn-outline"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm">Page {currentPage}</span>
      <button
        onClick={handleNextPage}
        disabled={!hasMore || loading}
        className="btn btn-sm btn-outline"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)}
```

---

### 5. src/components/admin/OTPManagement.jsx

**Current Logic (Lines ~26-51):**
```javascript
const loadAllCodes = async () => {
  const clientCodes = await otpService.getAllOTPs();
  const staffCodes = await otpService.getAllStaffInviteCodes();
  setClientOTPs(clientCodes);
  setStaffInviteCodes(staffCodes);
};
```

**Change To:**
```javascript
const [clientLastDoc, setClientLastDoc] = useState(null);
const [staffLastDoc, setStaffLastDoc] = useState(null);
const [clientHasMore, setClientHasMore] = useState(true);
const [staffHasMore, setStaffHasMore] = useState(true);
const [clientPage, setClientPage] = useState(1);
const [staffPage, setStaffPage] = useState(1);
const pageSize = 10;

const loadClientCodes = async (resetPage = false) => {
  setLoading(true);
  try {
    const result = await otpService.getAllOTPsPaginated(
      pageSize,
      resetPage ? null : clientLastDoc
    );
    setClientOTPs(result.otps);
    setClientLastDoc(result.lastDoc);
    setClientHasMore(result.hasMore);
    if (resetPage) setClientPage(1);
  } catch (error) {
    console.error('Error loading client OTPs:', error);
  } finally {
    setLoading(false);
  }
};

const loadStaffCodes = async (resetPage = false) => {
  setLoading(true);
  try {
    const result = await otpService.getAllStaffInviteCodesPaginated(
      pageSize,
      resetPage ? null : staffLastDoc
    );
    setStaffInviteCodes(result.codes);
    setStaffLastDoc(result.lastDoc);
    setStaffHasMore(result.hasMore);
    if (resetPage) setStaffPage(1);
  } catch (error) {
    console.error('Error loading staff invite codes:', error);
  } finally {
    setLoading(false);
  }
};

const loadAllCodes = async () => {
  await Promise.all([
    loadClientCodes(true),
    loadStaffCodes(true)
  ]);
};

// Pagination handlers for client codes
const handleClientNextPage = () => {
  if (clientHasMore) {
    setClientPage(prev => prev + 1);
    loadClientCodes(false);
  }
};

const handleClientPrevPage = () => {
  if (clientPage > 1) {
    setClientPage(prev => prev - 1);
    loadClientCodes(true);
  }
};

// Pagination handlers for staff codes
const handleStaffNextPage = () => {
  if (staffHasMore) {
    setStaffPage(prev => prev + 1);
    loadStaffCodes(false);
  }
};

const handleStaffPrevPage = () => {
  if (staffPage > 1) {
    setStaffPage(prev => prev - 1);
    loadStaffCodes(true);
  }
};

useEffect(() => {
  loadAllCodes();
}, []);

// Switch tabs
const handleTabChange = (tab) => {
  setActiveTab(tab);
  if (tab === 'client' && clientOTPs.length === 0) {
    loadClientCodes(true);
  } else if (tab === 'staff' && staffInviteCodes.length === 0) {
    loadStaffCodes(true);
  }
};
```

**Add Pagination UI (After table, ~Line 344):**
```javascript
{/* Pagination for Client Codes */}
{activeTab === 'client' && clientOTPs.length > 0 && (
  <div className="flex items-center justify-between p-4 border-t">
    <span className="text-sm text-gray-600">Page {clientPage}</span>
    <div className="flex items-center gap-2">
      <button onClick={handleClientPrevPage} disabled={clientPage === 1}>
        <ChevronLeft />
      </button>
      <button onClick={handleClientNextPage} disabled={!clientHasMore}>
        <ChevronRight />
      </button>
    </div>
  </div>
)}

{/* Pagination for Staff Codes */}
{activeTab === 'staff' && staffInviteCodes.length > 0 && (
  <div className="flex items-center justify-between p-4 border-t">
    <span className="text-sm text-gray-600">Page {staffPage}</span>
    <div className="flex items-center gap-2">
      <button onClick={handleStaffPrevPage} disabled={staffPage === 1}>
        <ChevronLeft />
      </button>
      <button onClick={handleStaffNextPage} disabled={!staffHasMore}>
        <ChevronRight />
      </button>
    </div>
  </div>
)}
```

---

### 6. src/components/admin/StaffManagement.jsx

**Current Logic (Lines ~17-30):**
```javascript
const loadUsers = async () => {
  const allUsers = await firestoreService.getAllUsers();
  const staffUsers = allUsers.filter(user => user.role === 'staff');
  setUsers(staffUsers);
};
```

**Change To:**
```javascript
const [lastDoc, setLastDoc] = useState(null);
const [hasMore, setHasMore] = useState(true);
const [currentPage, setCurrentPage] = useState(1);
const pageSize = 10;

const loadUsers = async (resetPage = false) => {
  setLoading(true);
  try {
    const result = await firestoreService.getAllUsersPaginated(
      pageSize,
      resetPage ? null : lastDoc,
      'staff' // Filter for staff role
    );
    setUsers(result.users);
    setLastDoc(result.lastDoc);
    setHasMore(result.hasMore);
    if (resetPage) setCurrentPage(1);
  } catch (error) {
    console.error('Failed to load users:', error);
    toast.error('Failed to load staff users');
  } finally {
    setLoading(false);
  }
};

const handleNextPage = () => {
  if (hasMore) {
    setCurrentPage(prev => prev + 1);
    loadUsers(false);
  }
};

const handlePrevPage = () => {
  if (currentPage > 1) {
    setCurrentPage(prev => prev - 1);
    loadUsers(true);
  }
};

useEffect(() => {
  loadUsers(true);
}, []);
```

**Add Pagination UI (After table, ~Line 282):**
```javascript
{/* Pagination */}
{users.length > 0 && (
  <div className="flex items-center justify-between p-4 border-t">
    <span className="text-sm text-gray-600">
      Page {currentPage} ({users.length} staff members)
    </span>
    <div className="flex items-center gap-2">
      <button
        onClick={handlePrevPage}
        disabled={currentPage === 1 || loading}
        className="btn btn-sm btn-outline"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm">Page {currentPage}</span>
      <button
        onClick={handleNextPage}
        disabled={!hasMore || loading}
        className="btn btn-sm btn-outline"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)}
```

---

## 🧪 Testing Checklist

For each updated component:
- [ ] Can load first page (verify only ~10 reads in Firebase Console)
- [ ] Can navigate to next page
- [ ] Can navigate to previous page
- [ ] Loading states work correctly
- [ ] Pagination controls disable when appropriate
- [ ] Search/filter still works (on current page)
- [ ] No console errors

---

## 📊 Expected Firebase Reads

### Before (Example with 1000 documents):
- ReportsPage: **1000 reads** per load
- NewStaffDashboard: **1000 reads** per load
- StaffReportsPage: **1000 reads** per load
- SchemeAssignment: **500 reads** per load
- OTPManagement: **200 reads** per load
- StaffManagement: **100 reads** per load
- **Total: ~3800 reads per session**

### After (Server-side pagination):
- ReportsPage: **10 reads** per page
- NewStaffDashboard: **10 reads** per page
- StaffReportsPage: **10 reads** per page
- SchemeAssignment: **10 reads** per page
- OTPManagement: **10 reads** per tab per page
- StaffManagement: **10 reads** per page
- **Total: ~60 reads per session (98.4% reduction!)**

---

## 🎉 Next Steps

1. Apply the changes above to each component
2. Test each page to ensure pagination works
3. Monitor Firebase Console to verify read count reduction
4. Celebrate the massive cost savings! 🎊

**Estimated Annual Savings: $1000+ depending on usage!**
