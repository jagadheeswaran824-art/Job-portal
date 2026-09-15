import "./App.css";

function App() {
  return (
    <div className="app">

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          Job<span>Connect</span>
        </div>

        <div className="nav-links">
          <a href="#">Home</a>
          <a href="#">Jobs</a>
          <a href="#">Companies</a>
          <a href="#">About</a>
          <a href="#" className="register-btn">
            Register
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">

          <h1>
            Find Your <span>Dream Job</span>
          </h1>

          <p>
            Discover thousands of job opportunities
            and build your future with JobConnect.
          </p>

          <div className="search-box">
            <input
              type="text"
              placeholder="Job title, skills or keywords"
            />

            <input
              type="text"
              placeholder="Location"
            />

            <button>
              🔍 Search Jobs
            </button>
          </div>

        </div>
      </section>

      {/* Features */}
      <section className="features">

        <h2>Why Choose JobConnect?</h2>

        <div className="feature-container">

          <div className="feature-card">
            <div className="icon">💼</div>

            <h3>Thousands of Jobs</h3>

            <p>
              Explore thousands of job opportunities
              from trusted companies and find the
              perfect career for you.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon">🤖</div>

            <h3>AI Job Matching</h3>

            <p>
              Our intelligent AI system recommends
              jobs based on your skills, experience
              and career interests.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon">🚀</div>

            <h3>Grow Your Career</h3>

            <p>
              Build your professional profile,
              apply for jobs and take the next
              step toward your dream career.
            </p>
          </div>

        </div>

      </section>

      {/* Footer */}
      <footer>
        <p>© 2026 JobConnect. All Rights Reserved.</p>
      </footer>

    </div>
  );
}

export default App;