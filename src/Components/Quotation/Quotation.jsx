import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import "./Quotation.css";

const Quotation = () => {
  const [formData, setFormData] = useState({
    // Company Details (Fixed)
    companyDetails: {
      name: "Webortex Web Designing Agency",
      tagline: "Design. Develop. Dominate.",
      address: "Tirupati, Andhra Pradesh, India, 517501",
      email: "webortex@gmail.com",
    },

    // Client Details
    clientDetails: {
      id: `WE${new Date().toISOString().slice(2, 4)}${new Date()
        .toISOString()
        .slice(5, 7)}${new Date().toISOString().slice(8, 10)}X${String(
        Math.floor(Math.random() * 1000)
      ).padStart(3, "0")}`,
      name: "",
      email: "",
      phone: "",
    },

    // Project Details
    projectDetails: {
      title: "",
      description: "",
      overview: "",
      scopeOfWork: [
        {
          title: "Consultation and Planning",
          points: [
            "Initial discussions to define requirements",
            "Research and analysis of similar platforms",
            "Preparation of a project timeline",
          ],
        },
      ],
    },

    // Services and Costs
    services: [
      {
        category: "Consultation & Planning",
        description: "Consultation & Planning",
        cost: 0,
      },
    ],

    // Timeline Phases
    timelinePhases: [
      {
        name: "Consultation and Planning",
        duration: 6,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
      },
    ],

    // Payment Terms
    paymentTerms: [
      "45% upfront payment upon agreement",
      "35% upon completion of development phase",
      "20% upon final delivery and launch",
    ],

    // Terms and Conditions
    termsAndConditions: [
      {
        title: "Revisions",
        points: [
          "The quotation includes up to 8 rounds of revisions",
          "Additional revisions will be billed at ₹399 per round",
        ],
      },
    ],
  });

  const addService = () => {
    setFormData((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        {
          category: "",
          description: "",
          cost: 0,
        },
      ],
    }));
  };

  const removeService = (index) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  const addTimelinePhase = () => {
    setFormData((prev) => ({
      ...prev,
      timelinePhases: [
        ...prev.timelinePhases,
        {
          name: "",
          duration: 0,
          startDate: "",
          endDate: "",
        },
      ],
    }));
  };

  const removeTimelinePhase = (index) => {
    setFormData((prev) => ({
      ...prev,
      timelinePhases: prev.timelinePhases.filter((_, i) => i !== index),
    }));
  };

  const addScopeItem = () => {
    setFormData((prev) => ({
      ...prev,
      projectDetails: {
        ...prev.projectDetails,
        scopeOfWork: [
          ...prev.projectDetails.scopeOfWork,
          {
            title: "",
            points: [""],
          },
        ],
      },
    }));
  };

  const removeScopeItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      projectDetails: {
        ...prev.projectDetails,
        scopeOfWork: prev.projectDetails.scopeOfWork.filter(
          (_, i) => i !== index
        ),
      },
    }));
  };

  const calculateTotal = () => {
    return formData.services.reduce(
      (sum, service) => sum + (service.cost || 0),
      0
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Client Details</h3>
              <div className="grid gap-3">
                <input
                  type="text"
                  placeholder="Client Name"
                  className="w-full p-2 border rounded"
                  value={formData.clientDetails.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clientDetails: {
                        ...formData.clientDetails,
                        name: e.target.value,
                      },
                    })
                  }
                />
                <input
                  type="email"
                  placeholder="Client Email"
                  className="w-full p-2 border rounded"
                  value={formData.clientDetails.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clientDetails: {
                        ...formData.clientDetails,
                        email: e.target.value,
                      },
                    })
                  }
                />
                <input
                  type="tel"
                  placeholder="Client Phone"
                  className="w-full p-2 border rounded"
                  value={formData.clientDetails.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clientDetails: {
                        ...formData.clientDetails,
                        phone: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Project Details</h3>
              <div className="grid gap-3">
                <input
                  type="text"
                  placeholder="Project Title"
                  className="w-full p-2 border rounded"
                  value={formData.projectDetails.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      projectDetails: {
                        ...formData.projectDetails,
                        title: e.target.value,
                      },
                    })
                  }
                />
                <textarea
                  placeholder="Project Description"
                  className="w-full p-2 border rounded"
                  rows="4"
                  value={formData.projectDetails.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      projectDetails: {
                        ...formData.projectDetails,
                        description: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Scope of Work</h3>
                <button
                  type="button"
                  onClick={addScopeItem}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                >
                  <Plus size={20} />
                </button>
              </div>
              {formData.projectDetails.scopeOfWork.map((scope, index) => (
                <div key={index} className="space-y-2 p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      placeholder="Section Title"
                      className="w-full p-2 border rounded"
                      value={scope.title}
                      onChange={(e) => {
                        const newScopeOfWork = [
                          ...formData.projectDetails.scopeOfWork,
                        ];
                        newScopeOfWork[index].title = e.target.value;
                        setFormData({
                          ...formData,
                          projectDetails: {
                            ...formData.projectDetails,
                            scopeOfWork: newScopeOfWork,
                          },
                        });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeScopeItem(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  {scope.points.map((point, pointIndex) => (
                    <input
                      key={pointIndex}
                      type="text"
                      placeholder="Bullet point"
                      className="w-full p-2 border rounded"
                      value={point}
                      onChange={(e) => {
                        const newScopeOfWork = [
                          ...formData.projectDetails.scopeOfWork,
                        ];
                        newScopeOfWork[index].points[pointIndex] =
                          e.target.value;
                        setFormData({
                          ...formData,
                          projectDetails: {
                            ...formData.projectDetails,
                            scopeOfWork: newScopeOfWork,
                          },
                        });
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newScopeOfWork = [
                        ...formData.projectDetails.scopeOfWork,
                      ];
                      newScopeOfWork[index].points.push("");
                      setFormData({
                        ...formData,
                        projectDetails: {
                          ...formData.projectDetails,
                          scopeOfWork: newScopeOfWork,
                        },
                      });
                    }}
                    className="text-sm text-blue-600"
                  >
                    + Add Point
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Services</h3>
                <button
                  type="button"
                  onClick={addService}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                >
                  <Plus size={20} />
                </button>
              </div>
              {formData.services.map((service, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Category"
                    className="w-1/3 p-2 border rounded"
                    value={service.category}
                    onChange={(e) => {
                      const newServices = [...formData.services];
                      newServices[index].category = e.target.value;
                      setFormData({ ...formData, services: newServices });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    className="flex-1 p-2 border rounded"
                    value={service.description}
                    onChange={(e) => {
                      const newServices = [...formData.services];
                      newServices[index].description = e.target.value;
                      setFormData({ ...formData, services: newServices });
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Cost"
                    className="w-32 p-2 border rounded"
                    value={service.cost}
                    onChange={(e) => {
                      const newServices = [...formData.services];
                      newServices[index].cost = parseFloat(e.target.value) || 0;
                      setFormData({ ...formData, services: newServices });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeService(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Timeline Phases</h3>
                <button
                  type="button"
                  onClick={addTimelinePhase}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                >
                  <Plus size={20} />
                </button>
              </div>
              {formData.timelinePhases.map((phase, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Phase Name"
                    className="flex-1 p-2 border rounded"
                    value={phase.name}
                    onChange={(e) => {
                      const newPhases = [...formData.timelinePhases];
                      newPhases[index].name = e.target.value;
                      setFormData({ ...formData, timelinePhases: newPhases });
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Days"
                    className="w-24 p-2 border rounded"
                    value={phase.duration}
                    onChange={(e) => {
                      const newPhases = [...formData.timelinePhases];
                      newPhases[index].duration = parseInt(e.target.value) || 0;
                      setFormData({ ...formData, timelinePhases: newPhases });
                    }}
                  />
                  <input
                    type="date"
                    className="w-40 p-2 border rounded"
                    value={phase.startDate}
                    onChange={(e) => {
                      const newPhases = [...formData.timelinePhases];
                      newPhases[index].startDate = e.target.value;
                      setFormData({ ...formData, timelinePhases: newPhases });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeTimelinePhase(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="quotation-preview" className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <h1 className="text-xl font-bold text-[#0f3f6e] ">
                    {formData.companyDetails.name}
                  </h1>
                  <p className="text-lg text-base font-semibold italic text-gray-800">
                    {formData.companyDetails.tagline}
                  </p>
                  <div className="mt-4">
                    <pre className="font-gillsans">
                      {formData.companyDetails.address}
                    </pre>
                    <p>Email: {formData.companyDetails.email}</p>
                  </div>
                </div>
                <div className="flex flex-col text-right">
                  <h1 className="text-2xl font-gillsans font-bold text-[#0e7169]">
                    QUOTATION
                  </h1>
                  <div className="text-sm mt-5">
                    <p>
                      <span className="uppercase font-gillsans text-[#06203a] font-semibold">
                        client id:
                      </span>{" "}
                      <span className="font-medium">
                        {formData.clientDetails.id}{" "}
                      </span>
                    </p>
                    <p>
                      <span className="uppercase font-gillsans text-[#06203a] font-semibold">
                        DATE:
                      </span>{" "}
                      <span className="font-medium">
                        {" "}
                        {new Date().toLocaleDateString("en-IN")}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

       
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="font-bold text-base text-black">To:</p>
                  <p>{formData.clientDetails.name}</p>
                  <p>{formData.clientDetails.email}</p>
                  <p>{formData.clientDetails.phone}</p>
                </div>
              </div>

              {/* Project Overview */}
              <div className="space-y-4">
                {/* <p className="font-bold">FOR:</p>
                <p>{formData.projectDetails.title}</p> */}

                <h2 className="text-xl font-bold mt-6">PROJECT OVERVIEW</h2>
                <p className="font-bold">
                  Project Title: {formData.projectDetails.title}
                </p>
                <p className="font-bold mt-4">Project Description:</p>
                <p>{formData.projectDetails.description}</p>

                <h2 className="text-xl font-bold mt-6">Scope of Work</h2>
                {formData.projectDetails.scopeOfWork.map((scope, index) => (
                  <div key={index} className="mt-4">
                    <p className="font-bold">
                      {index + 1}. {scope.title}:
                    </p>
                    <ul className="list-disc pl-8">
                      {scope.points.map((point, pointIndex) => (
                        <li key={pointIndex}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Services Table */}
              <div className="mt-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">SERVICES</th>
                      <th className="border p-2 text-left">DESCRIPTION</th>
                      <th className="border p-2 text-right">COST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.services.map((service, index) => (
                      <tr key={index}>
                        <td className="border p-2">{service.category}</td>
                        <td className="border p-2">{service.description}</td>
                        <td className="border p-2 text-right">
                          {service.cost > 0
                            ? `₹${service.cost.toLocaleString("en-IN")}`
                            : "Free"}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td colSpan="2" className="border p-2 text-right">
                        TOTAL
                      </td>
                      <td className="border p-2 text-right">
                        ₹{calculateTotal().toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment Terms */}
              <div className="mt-6">
                <h2 className="text-xl font-bold">Payment Terms</h2>
                <ul className="list-disc pl-8 mt-2">
                  {formData.paymentTerms.map((term, index) => (
                    <li key={index}>{term}</li>
                  ))}
                </ul>
              </div>

              {/* Project Timeline */}
              <div className="mt-6">
                <h2 className="text-xl font-bold">Project Timeline</h2>
                <table className="w-full border-collapse mt-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Phase</th>
                      <th className="border p-2">Duration</th>
                      <th className="border p-2">Start Date</th>
                      <th className="border p-2">End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.timelinePhases.map((phase, index) => (
                      <tr key={index}>
                        <td className="border p-2">{phase.name}</td>
                        <td className="border p-2">{phase.duration} Days</td>
                        <td className="border p-2">
                          {new Date(phase.startDate).toLocaleDateString(
                            "en-IN"
                          )}
                        </td>
                        <td className="border p-2">
                          {phase.startDate &&
                            new Date(
                              new Date(phase.startDate).getTime() +
                                phase.duration * 24 * 60 * 60 * 1000
                            ).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Terms and Conditions */}
              <div className="mt-6">
                <h2 className="text-xl font-bold">Terms and Conditions</h2>
                {formData.termsAndConditions.map((section, index) => (
                  <div key={index} className="mt-4">
                    <p className="font-bold">
                      {index + 1}. {section.title}:
                    </p>
                    <ul className="list-disc pl-8">
                      {section.points.map((point, pointIndex) => (
                        <li key={pointIndex}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Approval Section */}
              <div className="mt-12">
                <h2 className="text-xl font-bold">Approval</h2>
                <p className="mt-2">
                  By signing below, you agree to the terms and conditions
                  outlined in this quotation.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="border-t border-black pt-2">
                    Client Signature
                  </div>
                  <div>Date: {new Date().toLocaleDateString("en-IN")}</div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 text-sm">
                <p>
                  If you have any questions or need further clarification,
                  please do not hesitate to contact us at{" "}
                  {formData.companyDetails.email}.
                </p>
                <p className="mt-4">
                  Thank you for considering {formData.companyDetails.name} for
                  your website design needs!
                </p>
                <p className="mt-4">
                  Best regards,
                  <br />
                  Team Webortex
                </p>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => {
                  // Implementation for PDF export would go here
                  // using html2pdf or similar library
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Download PDF
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Quotation;
