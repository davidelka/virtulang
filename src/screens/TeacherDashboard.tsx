import studentsJson from '../content/mockStudents.json';
import { Bi, Tx } from '../components/Tx';
import { getActivity } from '../lib/content';
import { Link } from '../router';
import type { MockStudent } from '../types';

const students = studentsJson as MockStudent[];
const NUDGE_BELOW = 20;

export function TeacherDashboard() {
  const maxMin = Math.max(...students.map((s) => s.minutesThisWeek));
  const avg = Math.round(students.reduce((s, x) => s + x.minutesThisWeek, 0) / students.length);
  const total = students.reduce((s, x) => s + x.points, 0);

  return (
    <main className="teacher">
      <div className="teacher-head">
        <div>
          <h1><Tx t={(d) => d.teacher.title} /></h1>
          <p className="muted"><Tx t={(d) => d.teacher.subtitle} /></p>
        </div>
        <Link href="/" className="btn btn-secondary"><Tx t={(d) => d.teacher.backToApp} /></Link>
      </div>
      <div className="summary">
        <div className="stat"><b>{students.length}</b><small><Tx t={(d) => d.teacher.students} /></small></div>
        <div className="stat"><b>{avg}</b><small><Tx t={(d) => d.teacher.avgMinutes} /></small></div>
        <div className="stat"><b>{total}</b><small><Tx t={(d) => d.teacher.totalPoints} /></small></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th><Tx t={(d) => d.teacher.cols.name} /></th>
              <th><Tx t={(d) => d.teacher.cols.level} /></th>
              <th><Tx t={(d) => d.teacher.cols.points} /></th>
              <th><Tx t={(d) => d.teacher.cols.lastActivity} /></th>
              <th><Tx t={(d) => d.teacher.cols.minutes} /></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td><b>{s.name}</b></td>
                <td><span className="level-badge">{s.level}</span></td>
                <td>{s.points}</td>
                <td>
                  {(() => {
                    const a = getActivity(s.lastActivityId);
                    return a && <Bi ar={a.titleAr} he={a.titleHe} />;
                  })()}
                  <small className="muted"><Tx t={(d) => d.teacher.hoursAgo(s.hoursAgo)} /></small>
                </td>
                <td>
                  {s.minutesThisWeek}
                  <span className="minutes-bar" style={{ width: (s.minutesThisWeek / maxMin) * 80 }} />
                  {s.minutesThisWeek < NUDGE_BELOW && <span className="nudge"><Tx t={(d) => d.teacher.needsNudge} /></span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
