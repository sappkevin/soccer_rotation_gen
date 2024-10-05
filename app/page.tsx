'use client';

import React, { useState } from 'react';

interface Player {
  id: number;
  name: string;
  rank: number;
  present?: boolean;
}

interface PlayTime {
  totalPlayTime: number;
  fieldTimes: [number, number][];
  sidelineTimes: [number, number][];
}

interface PlayerWithPlayTime extends Player, PlayTime {}

const players: Player[] = [
  { id: 1, name: 'Luca', rank: 5 },
  { id: 2, name: 'Johnathan', rank: 5 },
  { id: 3, name: 'Arjun', rank: 5 },
  { id: 4, name: 'Trax', rank: 4 },
  { id: 5, name: 'Deevam', rank: 4 },
  { id: 6, name: 'Siddharth', rank: 4 },
  { id: 7, name: 'Nishtha', rank: 1 },
  { id: 8, name: 'Alana', rank: 1 },
  
];

export default function SoccerRotation() {
  const [attendance, setAttendance] = useState<Player[]>(players.map(p => ({ ...p, present: false })));
  const [schedule, setSchedule] = useState<Player[][]>([]);
  const [playTimeReport, setPlayTimeReport] = useState<PlayerWithPlayTime[]>([]);
  const [competitiveBalance, setCompetitiveBalance] = useState<number>(50);
  const [showReport, setShowReport] = useState<boolean>(false);

  const toggleAttendance = (id: number) => {
    setAttendance(attendance.map(p => 
      p.id === id ? { ...p, present: !p.present } : p
    ));
  };

  const createRotationSchedule = () => {
    const presentPlayers = attendance.filter(p => p.present);
    if (presentPlayers.length < 3) {
      alert('There must be at least 3 players present.');
      return;
    }

    const totalTime = 40; // 40-minute game
    const rotationTime = 5; // 5-minute rotations
    const rotations = totalTime / rotationTime;

    const newSchedule = generateBalancedSchedule(presentPlayers, rotations);
    setSchedule(newSchedule);
    setShowReport(false);
  };

  const generateReport = () => {
    if (schedule.length === 0) {
      alert('Please generate a rotation schedule first.');
      return;
    }

    const totalTime = 40;
    const report = generatePlayTimeReport(schedule, attendance.filter(p => p.present), totalTime);
    setPlayTimeReport(report);
    setShowReport(true);
  };

  const generateBalancedSchedule = (players: Player[], rotations: number): Player[][] => {
    const schedule: Player[][] = [];
    let playTime = players.map(() => 0);

    for (let i = 0; i < rotations; i++) {
      const currentRotation = selectPlayersForRotation(players, playTime, i, rotations);
      schedule.push(currentRotation);
      
      currentRotation.forEach(player => {
        const index = players.findIndex(p => p.id === player.id);
        playTime[index]++;
      });
    }

    return schedule;
  };

  const selectPlayersForRotation = (players: Player[], playTime: number[], currentRotation: number, totalRotations: number): Player[] => {
    const playersNeeded = 4;
    const isKeyMoment = currentRotation === 0 || currentRotation === totalRotations - 1 || currentRotation === Math.floor(totalRotations / 2);
    const maxPlayTimeDifference = 1; // This represents 5 minutes (1 rotation)

    // Calculate weights
    const fairPlayWeight = (100 - competitiveBalance) / 100;
    const rankWeight = competitiveBalance / 100;

    // Sort players by a combined score of play time and rank
    const sortedPlayers = players
      .map((player, index) => ({ 
        ...player, 
        playTime: playTime[index],
        score: fairPlayWeight * (1 / (playTime[index] + 1)) + rankWeight * (player.rank / 5)
      }))
      .sort((a, b) => b.score - a.score);

    const selectedPlayers: Player[] = [];
    const minPlayTime = Math.min(...playTime);

    // Select players based on the combined score
    for (const player of sortedPlayers) {
      if (selectedPlayers.length < playersNeeded &&
          (player.playTime - minPlayTime <= maxPlayTimeDifference || selectedPlayers.length < 2)) {
        selectedPlayers.push(player);
      }
      if (selectedPlayers.length === playersNeeded) break;
    }

    // If we still need players, add the ones with the highest score
    while (selectedPlayers.length < playersNeeded) {
      const nextPlayer = sortedPlayers.find(p => !selectedPlayers.some(sp => sp.id === p.id));
      if (nextPlayer) {
        selectedPlayers.push(nextPlayer);
      } else {
        break; // This should never happen, but it's a safeguard
      }
    }

    return selectedPlayers;
  };

  const getSubstitutions = (currentRotation: Player[], lastRotation: Player[]): { in: Player; out: Player }[] => {
    if (!lastRotation || lastRotation.length === 0) {
      return [];
    }

    const subs: { in: Player; out: Player }[] = [];
    const playersIn = currentRotation.filter(p => !lastRotation.some(lp => lp.id === p.id));
    const playersOut = lastRotation.filter(p => !currentRotation.some(cp => cp.id === p.id));

    // Match players coming in with players going out
    for (let i = 0; i < Math.min(playersIn.length, playersOut.length); i++) {
      subs.push({ in: playersIn[i], out: playersOut[i] });
    }

    return subs;
  };

  const generatePlayTimeReport = (schedule: Player[][], players: Player[], totalTime: number): PlayerWithPlayTime[] => {
    const playTime: Record<number, PlayTime> = players.reduce((acc, player) => ({
      ...acc, 
      [player.id]: { totalPlayTime: 0, fieldTimes: [], sidelineTimes: [] }
    }), {});
    
    schedule.forEach((rotation, index) => {
      const startTime = index * 5;
      const endTime = Math.min((index + 1) * 5, totalTime);

      rotation.forEach(player => {
        playTime[player.id].totalPlayTime += (endTime - startTime);
        if (index === 0 || !schedule[index - 1].some(p => p.id === player.id)) {
          playTime[player.id].fieldTimes.push([startTime, endTime]);
        } else {
          playTime[player.id].fieldTimes[playTime[player.id].fieldTimes.length - 1][1] = endTime;
        }
      });

      players.forEach(player => {
        if (!rotation.some(p => p.id === player.id)) {
          if (playTime[player.id].sidelineTimes.length === 0 || 
              playTime[player.id].sidelineTimes[playTime[player.id].sidelineTimes.length - 1][1] !== startTime) {
            playTime[player.id].sidelineTimes.push([startTime, endTime]);
          } else {
            playTime[player.id].sidelineTimes[playTime[player.id].sidelineTimes.length - 1][1] = endTime;
          }
        }
      });
    });

    return players
      .map(player => ({
        ...player,
        ...playTime[player.id]
      }))
      .sort((a, b) => b.totalPlayTime - a.totalPlayTime);
  };

  const formatTime = (minutes: number): string => {
    if (minutes === 40) return "End";
    const quarter = Math.floor(minutes / 10) + 1;
    const minuteInQuarter = minutes % 10;
    return `Q${quarter} - ${minuteInQuarter}:00`;
  };

  return (
    <div className="container mx-auto p-8 max-w-3xl">
  <h1 className="text-3xl font-bold mb-6">Soccer Team Rotation</h1>
  
  <div className="mb-8">
    <h2 className="text-2xl font-semibold mb-4">Player Attendance</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {attendance.map(player => (
        <div key={player.id} className="flex items-center">
          <input
            type="checkbox"
            checked={player.present}
            onChange={() => toggleAttendance(player.id)}
            className="mr-3 h-5 w-5"
          />
          <span className="text-lg">{player.name} </span>
        </div>
      ))}
    </div>
  </div>

  <div className="mb-8">
    <h2 className="text-2xl font-semibold mb-4">Competitive Balance</h2>
    <input 
      type="range" 
      min="0" 
      max="100" 
      value={competitiveBalance} 
      onChange={(e) => setCompetitiveBalance(Number(e.target.value))}
      className="w-full mb-2"
    />
    <div className="flex justify-between text-sm">
      <span>Fair Play</span>
      <span>{competitiveBalance}%</span>
      <span>Competitive</span>
    </div>
  </div>

  <div className="flex space-x-4 mb-8">
    <button
      onClick={createRotationSchedule}
      className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition duration-200"
    >
      Generate Rotation Schedule
    </button>
    <button
      onClick={generateReport}
      className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition duration-200"
    >
      Generate Report
    </button>
  </div>
  {schedule.length > 0 && (
  <div className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Rotation Schedule</h2>
        {schedule.map((rotation, index) => (
          <div key={index} className="mb-6 p-4 bg-gray-100 rounded-lg shadow">
            <div className="font-semibold text-lg mb-2">
              Quarter {Math.floor(index / 2) + 1} ({(index % 2) * 5}-{(index % 2) * 5 + 5} min):
            </div>
            <div className="mb-2">On field: {rotation.map(p => p.name).join(', ')}</div>
            {index > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Substitutions:</span>
                {getSubstitutions(rotation, schedule[index - 1]).map((sub, subIndex) => (
                  <div key={subIndex} className="ml-4">
                    {sub.in.name} replaces {sub.out.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )}

{showReport && playTimeReport.length > 0 && (
  <div className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Player Game Report</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {playTimeReport.map((player) => (
        <div key={player.id} className="p-4 bg-gray-100 rounded-lg shadow">
          <div className="font-semibold text-xl mb-2">{player.name}</div>
          <div className="mb-2">Total Play Time: {player.totalPlayTime} minutes</div>
          <div className="mb-2">
            <div className="font-semibold">Field Time:</div>
            {player.fieldTimes.map((time, index) => (
              <div key={index} className="ml-4">
                {formatTime(time[0])} - {formatTime(time[1])}
              </div>
            ))}
          </div>
          <div>
            <div className="font-semibold">Sideline Time:</div>
            {player.sidelineTimes.map((time, index) => (
              <div key={index} className="ml-4">
                {formatTime(time[0])} - {formatTime(time[1])}
              </div>
            ))}
          </div>
        </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}