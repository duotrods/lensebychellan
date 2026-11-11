import { lazy, Suspense, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapLocationDot, faSpinner } from "@fortawesome/free-solid-svg-icons";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";

// Leaflet is only needed on this page — keep it out of the main bundle.
const ResponderMap = lazy(() => import("../../components/admin/ResponderMap"));

const LiveMapPage = () => {
  const [count, setCount] = useState(0);

  return (
    <AdminSidebarLayout>
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faMapLocationDot} className="text-teal-500" />
          <h2 className="text-lg font-semibold text-gray-800">
            Operators En Route (M3)
          </h2>
          <span className="ml-auto rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-600">
            {count} sharing location
          </span>
        </div>
        <Suspense
          fallback={
            <div className="flex h-96 items-center justify-center sm:h-144">
              <FontAwesomeIcon icon={faSpinner} spin className="text-teal-500" />
            </div>
          }
        >
          <ResponderMap onCount={setCount} />
        </Suspense>
      </div>
    </AdminSidebarLayout>
  );
};

export default LiveMapPage;
