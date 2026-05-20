import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shuffle, RotateCcw, Undo2, Trophy, Copy, ImageDown, Save, FolderOpen } from "lucide-react";

const STORAGE_KEY = "team-draw-app-draft-v1";

function Button({ children, onClick, disabled, variant = "default", className = "", type = "button" }) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    default: "bg-emerald-300 text-emerald-950 hover:bg-emerald-400",
    secondary: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    outline: "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
    destructive: "bg-red-500 text-white hover:bg-red-600",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant] || styles.default} ${className}`}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-3xl bg-white/60 shadow-sm backdrop-blur-md ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function Input(props) {
  return <input {...props} className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-300" />;
}

function Textarea(props) {
  return <textarea {...props} className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-300" />;
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function createParticipant(name) {
  return {
    id: crypto.randomUUID(),
    name,
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function getTeamName(index) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < alphabet.length) return `${alphabet[index]}팀`;
  return `${index + 1}팀`;
}

function App() {
  const [step, setStep] = useState("input");
  const [nameInput, setNameInput] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [history, setHistory] = useState([]);
  const [drawDisplay, setDrawDisplay] = useState("팀장 뽑기를 눌러주세요");
  const [lastDrawn, setLastDrawn] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragging, setDragging] = useState(null);
  const resultRef = useRef(null);

  const unassignedParticipants = useMemo(() => {
    const usedIds = new Set();
    teams.forEach((team) => {
      usedIds.add(team.leader.id);
      team.members.forEach((member) => usedIds.add(member.id));
    });
    return participants.filter((person) => !usedIds.has(person.id));
  }, [participants, teams]);

  const currentState = useMemo(
    () => ({ step, participants, teams, drawDisplay, lastDrawn }),
    [step, participants, teams, drawDisplay, lastDrawn]
  );

  function pushHistory() {
    setHistory((prev) => [...prev.slice(-30), cloneState(currentState)]);
  }

  function undo() {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStep(last.step);
      setParticipants(last.participants);
      setTeams(last.teams);
      setDrawDisplay(last.drawDisplay);
      setLastDrawn(last.lastDrawn);
      return prev.slice(0, -1);
    });
  }

  function addSingleName() {
    const name = normalizeName(nameInput);
    if (!name) return;
    if (participants.some((person) => person.name === name)) {
      alert("이미 등록된 이름입니다.");
      return;
    }
    pushHistory();
    setParticipants((prev) => [...prev, createParticipant(name)]);
    setNameInput("");
  }

  function addBulkNames() {
    const names = bulkInput
      .split(/\n|,/) 
      .map(normalizeName)
      .filter(Boolean);

    if (names.length === 0) return;

    const existing = new Set(participants.map((person) => person.name));
    const seen = new Set();
    const uniqueNames = [];
    const duplicated = [];

    names.forEach((name) => {
      if (existing.has(name) || seen.has(name)) {
        duplicated.push(name);
      } else {
        seen.add(name);
        uniqueNames.push(name);
      }
    });

    if (uniqueNames.length > 0) {
      pushHistory();
      setParticipants((prev) => [...prev, ...uniqueNames.map(createParticipant)]);
      setBulkInput("");
    }

    if (duplicated.length > 0) {
      alert(`중복 이름은 제외했습니다.\n${[...new Set(duplicated)].join(", ")}`);
    }
  }

  function removeParticipant(id) {
    pushHistory();
    setParticipants((prev) => prev.filter((person) => person.id !== id));
  }

  function saveData() {
    const data = { participants, teams, step, drawDisplay, lastDrawn };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    alert("저장되었습니다.");
  }

  function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      alert("저장된 데이터가 없습니다.");
      return;
    }
    try {
      const data = JSON.parse(raw);
      pushHistory();
      setParticipants(data.participants || []);
      setTeams(data.teams || []);
      setStep(data.step || "input");
      setDrawDisplay(data.drawDisplay || "팀장 뽑기를 눌러주세요");
      setLastDrawn(data.lastDrawn || null);
    } catch {
      alert("저장 데이터를 불러오지 못했습니다.");
    }
  }

  function resetAll() {
    if (!confirm("전체 내용을 초기화할까요?")) return;
    pushHistory();
    setStep("input");
    setParticipants([]);
    setTeams([]);
    setDrawDisplay("팀장 뽑기를 눌러주세요");
    setLastDrawn(null);
  }

  function resetLeaders() {
    if (!confirm("팀장 뽑기와 팀 구성을 초기화할까요? 참가자 명단은 유지됩니다.")) return;
    pushHistory();
    setTeams([]);
    setDrawDisplay("팀장 뽑기를 눌러주세요");
    setLastDrawn(null);
  }

  function goToTeamBuild() {
    if (teams.length < 1) {
      alert("팀장이 최소 1명 이상 필요합니다.");
      return;
    }
    pushHistory();
    setStep("build");
  }

  function drawLeader() {
    if (isDrawing) return;
    if (unassignedParticipants.length === 0) {
      alert("뽑을 수 있는 참가자가 없습니다.");
      return;
    }

    pushHistory();
    setIsDrawing(true);
    setLastDrawn(null);

    let tick = 0;
    const maxTicks = 24;
    const interval = setInterval(() => {
      const randomPerson = unassignedParticipants[Math.floor(Math.random() * unassignedParticipants.length)];
      setDrawDisplay(randomPerson.name);
      tick += 1;

      if (tick >= maxTicks) {
        clearInterval(interval);
        const finalPerson = unassignedParticipants[Math.floor(Math.random() * unassignedParticipants.length)];
        const newTeam = {
          id: crypto.randomUUID(),
          name: getTeamName(teams.length),
          leader: finalPerson,
          members: [],
        };
        setDrawDisplay(`최종: ${finalPerson.name}`);
        setLastDrawn(finalPerson);
        setTeams((prev) => [...prev, newTeam]);
        setIsDrawing(false);
      }
    }, 70);
  }

  function cancelLeader(teamId) {
    const team = teams.find((item) => item.id === teamId);
    if (!team) return;
    if (team.members.length > 0) {
      const ok = confirm("이 팀에는 배치된 팀원이 있습니다. 팀을 취소하면 팀원들이 다시 미배치 명단으로 돌아갑니다. 계속하시겠습니까?");
      if (!ok) return;
    }
    pushHistory();
    const remainingTeams = teams.filter((item) => item.id !== teamId);
    setTeams(renumberTeams(remainingTeams));
  }

  function renumberTeams(list) {
    return list.map((team, index) => ({ ...team, name: getTeamName(index) }));
  }

  function handleDragStart(person, fromTeamId = null) {
    setDragging({ person, fromTeamId });
  }

  function handleDropToTeam(targetTeamId) {
    if (!dragging) return;
    pushHistory();

    setTeams((prev) => {
      let next = prev.map((team) => ({
        ...team,
        members: team.members.filter((member) => member.id !== dragging.person.id),
      }));

      next = next.map((team) => {
        if (team.id !== targetTeamId) return team;
        if (team.leader.id === dragging.person.id) return team;
        return { ...team, members: [...team.members, dragging.person] };
      });

      return next;
    });
    setDragging(null);
  }

  function handleDropToUnassigned() {
    if (!dragging) return;
    pushHistory();
    setTeams((prev) =>
      prev.map((team) => ({
        ...team,
        members: team.members.filter((member) => member.id !== dragging.person.id),
      }))
    );
    setDragging(null);
  }

  function completeTeams() {
    if (teams.length < 1) {
      alert("팀장이 최소 1명 이상 필요합니다.");
      return;
    }
    if (unassignedParticipants.length > 0) {
      const ok = confirm("아직 배치되지 않은 참가자가 있습니다.\n그래도 완료하시겠습니까?");
      if (!ok) return;
    }
    pushHistory();
    setStep("result");
  }

  function copyResultText() {
    const text = teams
      .map((team) => {
        const members = team.members.map((member) => member.name).join(", ") || "없음";
        return `[${team.name}]\n팀장: ${team.leader.name}\n팀원: ${members}`;
      })
      .join("\n\n");
    navigator.clipboard.writeText(text);
    alert("결과 텍스트를 복사했습니다.");
  }

  async function saveResultImage() {
    try {
      const padding = 48;
      const teamHeight = 150;
      const width = 1000;
      const height = 190 + teams.length * teamHeight + padding;
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);

      ctx.fillStyle = "#fff7fb";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#ffffff";
      roundRect(ctx, 24, 24, width - 48, height - 48, 28);
      ctx.fill();

      ctx.fillStyle = "#047857";
      ctx.font = "bold 42px Arial, sans-serif";
      ctx.fillText("카치아 팀원뽑기 결과", padding, 88);

      ctx.fillStyle = "#64748b";
      ctx.font = "24px Arial, sans-serif";
      ctx.fillText(`총 ${teams.length}개 팀`, padding, 128);

      let y = 170;
      teams.forEach((team) => {
        ctx.fillStyle = "#ecfdf5";
        roundRect(ctx, padding, y, width - padding * 2, 118, 22);
        ctx.fill();

        ctx.fillStyle = "#064e3b";
        ctx.font = "bold 30px Arial, sans-serif";
        ctx.fillText(team.name, padding + 24, y + 42);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 22px Arial, sans-serif";
        ctx.fillText(`팀장: ${team.leader.name}`, padding + 24, y + 76);

        ctx.fillStyle = "#475569";
        ctx.font = "20px Arial, sans-serif";
        const memberText = team.members.map((member) => member.name).join(", ") || "없음";
        ctx.fillText(`팀원: ${memberText}`, padding + 24, y + 104);

        y += teamHeight;
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "카치아-팀원뽑기-결과.png";
      link.click();
    } catch (error) {
      alert("이미지 저장 중 문제가 발생했습니다.");
      console.error(error);
    }
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  return (
    <div
      className="min-h-screen bg-pink-50 bg-cover bg-center bg-fixed p-4 text-slate-900"
      style={{ backgroundImage: "url('/images/background.png')" }}
    >
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-3xl bg-white/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-8">
                <h1 className="text-center text-5xl font-black leading-tight text-emerald-500 drop-shadow-sm">
                  카치아<br />
                  팀원뽑기!
                </h1>
                <img
                  src="/images/title-sticker.png"
                  alt="제목 스티커"
                  className="hidden h-52 w-52 object-contain sm:block"
                />
              </div>
              <p className="text-sm text-slate-500">참가자 입력 → 팀장 뽑기 → 드래그 팀 구성 → 결과 확인</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={saveData}><Save className="mr-2 h-4 w-4" />저장</Button>
              <Button variant="outline" onClick={loadData}><FolderOpen className="mr-2 h-4 w-4" />불러오기</Button>
              <Button variant="outline" onClick={undo} disabled={history.length === 0}><Undo2 className="mr-2 h-4 w-4" />직전으로</Button>
              <Button variant="destructive" onClick={resetAll}><RotateCcw className="mr-2 h-4 w-4" />전체 초기화</Button>
            </div>
          </div>
        </header>

        <nav className="grid grid-cols-4 gap-2 text-center text-sm font-semibold">
          {[
            ["input", "1. 참가자 입력"],
            ["draw", "2. 팀장 뽑기"],
            ["build", "3. 팀 구성"],
            ["result", "4. 결과 확인"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                if ((key === "build" || key === "result") && teams.length < 1) {
                  alert("팀장이 최소 1명 이상 필요합니다.");
                  return;
                }
                pushHistory();
                setStep(key);
              }}
              className={`rounded-2xl px-3 py-3 shadow-sm ${step === key ? "bg-emerald-300/90 text-emerald-950" : "bg-white/60 text-slate-500 backdrop-blur-md"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.section key="input" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <Card>
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-center gap-3">
                    <img
                      src="/images/participants-sticker.png"
                      alt="참가자 명단 스티커"
                      className="h-52 w-52 object-contain"
                    />
                    <div className="flex items-center gap-2 text-3xl font-black"><Users className="h-7 w-7" />참가자 입력</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm">현재 등록 인원: <b>{participants.length}</b>명 / 미배치 가능 인원: <b>{unassignedParticipants.length}</b>명</div>

                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <Input
                      placeholder="이름을 입력하세요"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSingleName()}
                    />
                    <Button onClick={addSingleName}>1명 추가</Button>
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="여러 명을 줄바꿈 또는 쉼표로 입력하세요"
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      rows={5}
                    />
                    <Button variant="secondary" onClick={addBulkNames}>여러 명 추가</Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {participants.map((person) => (
                      <span key={person.id} className="rounded-full bg-white px-3 py-2 text-sm shadow-sm">
                        {person.name}
                        <button className="ml-2 text-red-500" onClick={() => removeParticipant(person.id)}>×</button>
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => { pushHistory(); setStep("draw"); }}>팀장 뽑기로 이동</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {step === "draw" && (
            <motion.section key="draw" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <Card>
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-center gap-2 text-3xl font-black"><Shuffle className="h-7 w-7" />팀장 먼저 뽑기</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">전체 참가자 <b>{participants.length}</b>명</div>
                    <div className="rounded-2xl bg-slate-50 p-4">뽑힌 팀장 <b>{teams.length}</b>명</div>
                    <div className="rounded-2xl bg-slate-50 p-4">남은 참가자 <b>{unassignedParticipants.length}</b>명</div>
                  </div>

                  <div className="rounded-3xl bg-emerald-300 p-8 text-center text-emerald-950 shadow-lg">
                    <motion.div key={drawDisplay} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-black">
                      {drawDisplay}
                    </motion.div>
                    {lastDrawn && <p className="mt-3 text-slate-300">{lastDrawn.name} 님이 팀장으로 뽑혔습니다.</p>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={drawLeader} disabled={isDrawing || unassignedParticipants.length === 0}>팀장 뽑기</Button>
                    <Button variant="outline" onClick={resetLeaders}>팀장 뽑기 초기화</Button>
                  </div>

                  <div className="space-y-3">
                    <h2 className="font-bold">생성된 팀</h2>
                    {teams.length === 0 && <p className="text-sm text-slate-500">아직 생성된 팀이 없습니다.</p>}
                    {teams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                        <div>
                          <b>{team.name}</b>
                          <p className="text-sm text-slate-600">팀장: {team.leader.name}</p>
                        </div>
                        <Button variant="outline" onClick={() => cancelLeader(team.id)}>취소하기</Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end border-t border-emerald-100 pt-4">
                    <Button onClick={goToTeamBuild} className="px-8 py-3 text-base">팀 구성으로 이동</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {step === "build" && (
            <motion.section key="build" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <Card>
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src="/images/team-left-sticker.png"
                        alt="팀 목록 왼쪽 스티커"
                        className="h-52 w-52 object-contain"
                      />
                      <div className="flex items-center gap-2 text-3xl font-black"><Users className="h-7 w-7" />팀원 드래그 배치</div>
                    </div>
                    <img
                      src="/images/team-right-sticker.png"
                      alt="팀 목록 오른쪽 스티커"
                      className="hidden h-52 w-52 object-contain sm:block"
                    />
                  </div>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropToUnassigned}
                    className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-4"
                  >
                    <div className="mb-3 font-bold">남은 참가자: {unassignedParticipants.length}명</div>
                    <div className="flex min-h-14 flex-wrap gap-2">
                      {unassignedParticipants.map((person) => (
                        <span
                          key={person.id}
                          draggable
                          onDragStart={() => handleDragStart(person)}
                          className="cursor-grab rounded-full bg-white px-3 py-2 text-sm shadow-sm active:cursor-grabbing"
                        >
                          {person.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropToTeam(team.id)}
                        className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-black">{team.name}</h3>
                            <p className="text-sm text-slate-500">팀장: {team.leader.name} / 팀원 {team.members.length}명</p>
                          </div>
                          <Button variant="outline" onClick={() => cancelLeader(team.id)}>팀 취소</Button>
                        </div>
                        <div className="min-h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-3">
                          <div className="flex flex-wrap gap-2">
                            {team.members.map((member) => (
                              <span
                                key={member.id}
                                draggable
                                onDragStart={() => handleDragStart(member, team.id)}
                                className="cursor-grab rounded-full bg-slate-900 px-3 py-2 text-sm text-white shadow-sm active:cursor-grabbing"
                              >
                                {member.name}
                              </span>
                            ))}
                            {team.members.length === 0 && <span className="text-sm text-slate-400">여기로 참가자를 드래그하세요</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetLeaders}>팀 구성 초기화</Button>
                    <Button onClick={completeTeams}>완료</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {step === "result" && (
            <motion.section key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <Card>
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-center gap-3">
                    <img
                      src="/images/result-sticker.png"
                      alt="결과 확인 스티커"
                      className="h-56 w-56 object-contain"
                    />
                    <div className="flex items-center gap-2 text-3xl font-black"><Trophy className="h-7 w-7" />결과 확인</div>
                  </div>
                  <div ref={resultRef} className="space-y-4 rounded-3xl bg-slate-50 p-5">
                    {teams.map((team) => (
                      <div key={team.id} className="rounded-3xl bg-white p-4 shadow-sm">
                        <h3 className="text-xl font-black">{team.name}</h3>
                        <p className="mt-2 font-semibold">팀장: {team.leader.name}</p>
                        <p className="mt-1 text-slate-600">팀원: {team.members.map((member) => member.name).join(", ") || "없음"}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => { pushHistory(); setStep("build"); }}>팀 구성으로 돌아가기</Button>
                    <Button variant="secondary" onClick={copyResultText}><Copy className="mr-2 h-4 w-4" />텍스트 복사</Button>
                    <Button onClick={saveResultImage}><ImageDown className="mr-2 h-4 w-4" />이미지 저장</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
