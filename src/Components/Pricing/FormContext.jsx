import React, { createContext, useState, useContext } from "react";

const FormContext = createContext();

export const FormProvider = ({ children }) => {
  const [formData, setFormData] = useState({
    userInfo: {},
    specificInfo: {},
  });

  const updateUserInfo = (data) => {
    setFormData((prev) => ({
      ...prev,
      userInfo: { ...prev.userInfo, ...data },
    }));
  };

  const updateSpecificInfo = (data) => {
    setFormData((prev) => ({
      ...prev,
      specificInfo: { ...prev.specificInfo, ...data },
    }));
  };

  const resetForm = () => {
    setFormData({
      userInfo: {},
      specificInfo: {},
    });
  };

  return (
    <FormContext.Provider
      value={{
        formData,
        updateUserInfo,
        updateSpecificInfo,
        resetForm,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};

export const useForm = () => useContext(FormContext);
