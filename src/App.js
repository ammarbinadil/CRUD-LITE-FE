import React, { useState } from "react";
import PersonsView from "./pages/PersonsView";
import AccountsView from "./pages/AccountsView";
import SearchView from "./pages/SearchView";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("persons");

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">CRUD-LITE</span>
          </div>
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === "persons" ? "active" : ""}`}
              onClick={() => setActiveTab("persons")}
            >
              <span className="tab-icon">👤</span> Persons
            </button>
            <button
              className={`nav-tab ${activeTab === "accounts" ? "active" : ""}`}
              onClick={() => setActiveTab("accounts")}
            >
              <span className="tab-icon">💳</span> Accounts
            </button>
            <button
              className={`nav-tab ${activeTab === "search" ? "active" : ""}`}
              onClick={() => setActiveTab("search")}
            >
              <span className="tab-icon">🔍</span> Search
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {activeTab === "persons" && <PersonsView />}
        {activeTab === "accounts" && <AccountsView />}
        {activeTab === "search" && <SearchView />}
      </main>
    </div>
  );
}
