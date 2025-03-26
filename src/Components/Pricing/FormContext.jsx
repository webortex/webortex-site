import React, { createContext, useState, useContext } from "react";

const FormContext = createContext();

export const FormProvider = ({ children }) => {
  const [formData, setFormData] = useState({
    userInfo: {},
    projectInfo: {},
    specificInfo: {},
  });

  const updateUserInfo = (data) => {
    setFormData((prev) => ({
      ...prev,
      userInfo: { ...prev.userInfo, ...data },
    }));
  };

  const updateProjectInfo = (data) => {
    setFormData((prev) => ({
      ...prev,
      projectInfo: { ...prev.projectInfo, ...data },
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
      projectInfo: {},
      specificInfo: {},
    });
  };

  return (
    <FormContext.Provider
      value={{
        formData,
        updateUserInfo,
        updateProjectInfo,
        updateSpecificInfo,
        resetForm,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};

export const useForm = () => useContext(FormContext);
