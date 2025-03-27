import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../Firebaseconfig";

export const FormProvider = ({ children }) => {
  const [formStages, setFormStages] = useState({
    quotation: {},
    specificForm: {},
  });

  const updateQuotationData = (data) => {
    setFormStages((prev) => ({
      ...prev,
      quotation: { ...prev.quotation, ...data },
    }));
  };

  const updateSpecificFormData = (data) => {
    setFormStages((prev) => ({
      ...prev,
      specificForm: { ...prev.specificForm, ...data },
    }));
  };

  const submitAllData = async (specificFormType) => {
    try {
      const completeData = {
        ...formStages.quotation,
        ...formStages.specificForm,
        formType: specificFormType,
        submittedAt: new Date().toISOString(),
      };

      // Create a document reference with auto-generated ID
      const docRef = doc(db, "applications");

      // Add document to Firestore
      await setDoc(docRef, completeData);

      return true;
    } catch (error) {
      console.error("Firestore Error:", error);
      throw error;
    }
  };

  const resetForms = () => {
    setFormStages({
      quotation: {},
      specificForm: {},
    });
  };

  return (
    <FormContext.Provider
      value={{
        formStages,
        updateQuotationData,
        updateSpecificFormData,
        submitAllData,
        resetForms,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};
