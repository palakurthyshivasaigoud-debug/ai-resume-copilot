import sys
sys.path.insert(0, '.')
from services.ats_scoring import calculate_ats_score

result = calculate_ats_score(
    {
        'personal_info': {'name': 'Palak', 'email': 'p@p.com', 'summary': 'Data Analyst skilled in Python SQL Machine Learning Pandas NumPy Power BI'},
        'skills': ['Python', 'SQL', 'Machine Learning', 'Pandas', 'NumPy', 'Data Analysis', 'Power BI', 'Tableau'],
        'experience': [{'company': 'ABC', 'role': 'Data Analyst Intern', 'description': ['Analyzed data using Python and SQL', 'Built machine learning models', 'Created Power BI dashboards']}],
        'education': [{'institution': 'IIIT', 'degree': 'B.Tech', 'field_of_study': 'Computer Science'}],
        'projects': [{'name': 'ML Model', 'description': 'Machine learning using Python Scikit-learn', 'technologies': ['Python', 'Scikit-learn']}],
        'certifications': ['Python for Data Science']
    },
    'Data Analyst or AI Intern with Python SQL Machine Learning Data Analysis Pandas NumPy Power BI Tableau',
    'Data Analyst AI Intern'
)
print('Overall score:', result['score'])
for k, v in result['breakdown'].items():
    print(f'  {k}: {v["score"]}')
print('Matched:', result['matched_keywords'][:10])
print('Missing:', result['missing_keywords'][:10])
