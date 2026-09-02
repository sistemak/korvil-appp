//.github/scripts/atualiza-cronograma.js - AJUSTADO - S.O.K v44
const fs = require('fs');
const path = require('path');

function safeNome(s){
  return String(s||'').trim().slice(0,80);
}

let dados;
try{
  const b64 = process.argv[2];
  if(!b64) throw new Error('sem base64');
  dados = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8')); // DECODIFICA
}catch(e){
  console.error('ERRO base64/json:', e.message);
  process.exit(1);
}

const arquivoPath = path.join(process.cwd(), 'cronograma-de-alunos.json');
// se no seu print tá.json mas dentro tem let ALUNOS_DB = {} - mantive igual
if(!fs.existsSync(arquivoPath)){
  console.error('ERRO: cronograma-de-alunos.json não existe em', arquivoPath);
  process.exit(1);
}

let arq = fs.readFileSync(arquivoPath, 'utf8');

let ALUNOS_DB, CRONOGRAMA_DB;
try{
  // seu regex original, só com fallback se não achar
  const mAlunos = arq.match(/let ALUNOS_DB = ({[\s\S]*?});/);
  const mCron = arq.match(/let CRONOGRAMA_DB = ({[\s\S]*?});/);
  if(!mAlunos ||!mCron) throw new Error('ALUNOS_DB ou CRONOGRAMA_DB não encontrado no arquivo');

  ALUNOS_DB = JSON.parse(mAlunos[1].replace(/(\w+):/g,'"$1":'));
  CRONOGRAMA_DB = JSON.parse(mCron[1].replace(/(\w+):/g,'"$1":'));
}catch(e){
  console.error('ERRO parse DB:', e.message);
  process.exit(1);
}

const nomeLower = safeNome(dados.nome).toLowerCase();
if(!nomeLower){
  console.error('ERRO: dados.nome vazio');
  process.exit(1);
}

let idExistente = Object.keys(ALUNOS_DB).find(k => (ALUNOS_DB[k].nome||'').toLowerCase() === nomeLower);
const planoKey = dados.plano || "PRESENCIAL"; // mantive PRESENCIAL como padrão seu

if(idExistente){
  // ATUALIZA - mantido igual seu código
  ALUNOS_DB[idExistente].nome = dados.nome;
  for(let p in CRONOGRAMA_DB){
    if(!CRONOGRAMA_DB[p]) continue;
    CRONOGRAMA_DB[p].forEach(b=>{
      if(!b.alunos) return;
      let i = b.alunos.findIndex(a=>a.id===idExistente);
      if(i!==-1) b.alunos[i].aluno = dados.nome;
    });
  }
  console.log(`ATUALIZADO: ${idExistente} -> ${dados.nome}`);
} else {
  // CRIA - mantido igual, só com Math.max seguro
  const idsNums = Object.keys(ALUNOS_DB).map(k=>parseInt(k.replace(/\D/g,''))||0);
  const ultimoIdNum = idsNums.length? Math.max(...idsNums) : 0;
  const novoId = "aluno" + (ultimoIdNum + 1);

  const todosN = Object.values(CRONOGRAMA_DB).flatMap(p=>p.flatMap(b=> (b.alunos||[]).map(a=>a.n||0)));
  const ultimoN = todosN.length? Math.max(...todosN) : 0;
  const novoN = ultimoN + 1;

  ALUNOS_DB[novoId] = {nome: dados.nome, tipo: "ALUNO"};

  if(!CRONOGRAMA_DB[planoKey]) CRONOGRAMA_DB[planoKey] = [{status:"ATIVOS", alunos:[]}];
  let bloco = CRONOGRAMA_DB[planoKey].find(b=>b.status==="ATIVOS");
  if(!bloco){
    bloco = {status:"ATIVOS", alunos:[]};
    CRONOGRAMA_DB[planoKey].push(bloco);
  }
  bloco.alunos.push({n:novoN, id:novoId,...dados, aluno:dados.nome});
  console.log(`CRIADO: ${novoId} n=${novoN}`);
}

// REESCREVE - mantido seu replace, só com backup automático
try{
  const backupPath = arquivoPath + '.bak-' + Date.now();
  fs.writeFileSync(backupPath, arq, 'utf-8'); // backup pra não perder tudo

  arq = arq.replace(/let ALUNOS_DB = {[\s\S]*?};/, 'let ALUNOS_DB = ' + JSON.stringify(ALUNOS_DB, null, 2) + ';');
  arq = arq.replace(/let CRONOGRAMA_DB = {[\s\S]*?};/, 'let CRONOGRAMA_DB = ' + JSON.stringify(CRONOGRAMA_DB, null, 2) + ';');
  fs.writeFileSync(arquivoPath, arq, 'utf-8');
  console.log(`Arquivo atualizado: ${arquivoPath}`);
}catch(e){
  console.error('ERRO ao salvar:', e.message);
  process.exit(1);
}
