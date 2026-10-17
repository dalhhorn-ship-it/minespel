// Rekenen lesson pages (Dutch, for kids of 8 to 10 reading at groep 5 level).
// Strategies: splitsen, rijgen, tafeltrucs, delen als omgekeerd keer (PRD 4.10).
import type { Lesson } from '../format';

export const optellenLesson: Lesson = {
  pages: [
    {
      title: 'Splitsen: eerst de tientallen',
      skill: 'plus',
      text: 'Een grote som is lastig in één keer. Knip het tweede getal in tientallen en eenheden. Tel eerst de tientallen erbij. Tel dan de eenheden erbij.',
      examples: [
        { good: '47 + 38 = 47 + 30 + 8 = 77 + 8 = 85', why: 'Eerst +30, dan +8.' },
      ],
      tip: 'Zeg het hardop: eerst de tientallen, dan de eenheden.',
    },
    {
      title: 'Over het tiental heen',
      text: 'Kom je bij de eenheden over de tien heen? Maak er dan eerst een rond tiental van. Tel daarna de rest erbij.',
      examples: [
        { good: '77 + 8 = 77 + 3 + 5 = 80 + 5 = 85', why: 'Met 3 kom je precies op 80.' },
        { good: '56 + 7 = 56 + 4 + 3 = 60 + 3 = 63' },
      ],
      tip: 'Kijk hoeveel je nodig hebt om bij het volgende tiental te komen.',
    },
    {
      title: 'Grote getallen: stap voor stap',
      text: 'Bij honderdtallen en duizendtallen werkt het net zo. Begin bij de grootste stukken. Werk naar de kleinste. Schrijf elke stap op.',
      examples: [
        { good: '364 + 258 = 364 + 200 + 50 + 8 = 564 + 50 + 8 = 614 + 8 = 622' },
      ],
      tip: 'Controleer: klopt je antwoord ongeveer? 364 + 258 is bijna 360 + 260 = 620.',
    },
    {
      title: 'Optellen met komma',
      text: 'Een getal met een komma heeft tienden. 3,4 is 34 tienden. Tel de tienden op alsof het hele getallen zijn. Zet de komma er daarna weer in.',
      examples: [
        { good: '3,4 + 5,7 = 34 tienden + 57 tienden = 91 tienden = 9,1' },
      ],
      tip: 'De komma staat bij het antwoord weer op dezelfde plek: nog één cijfer erachter.',
    },
  ],
};

export const aftrekkenLesson: Lesson = {
  pages: [
    {
      title: 'Rijgen: stap voor stap terug',
      skill: 'min',
      text: 'Bij rijgen haal je het tweede getal in stukjes weg. Begin met de tientallen. Haal dan de eenheden weg.',
      examples: [
        { good: '83 - 47 = 83 - 40 - 7 = 43 - 7 = 36', why: 'Eerst -40, dan -7.' },
      ],
      tip: 'Je zet steeds één stap op de getallenlijn.',
    },
    {
      title: 'Over het tiental heen',
      text: 'Gaat de eenheid niet af? Haal dan eerst zoveel weg dat je op een rond tiental komt. Haal daarna de rest weg.',
      examples: [
        { good: '43 - 7 = 43 - 3 - 4 = 40 - 4 = 36', why: 'Met 3 kom je precies op 40.' },
        { good: '62 - 8 = 62 - 2 - 6 = 60 - 6 = 54' },
      ],
    },
    {
      title: 'Aftrekken is omgekeerd optellen',
      text: 'Je kunt controleren met optellen. Tel je antwoord bij het kleine getal op. Komt er het grote getal uit? Dan klopt het.',
      examples: [
        { good: '83 - 47 = 36, want 47 + 36 = 83' },
      ],
      tip: 'Het antwoord is nooit minder dan 0 in deze oefeningen.',
    },
    {
      title: 'Aftrekken met komma',
      text: 'Reken met tienden, zoals bij optellen. 8,3 is 83 tienden. Haal de tienden van elkaar af. Zet de komma er weer in.',
      examples: [
        { good: '8,3 - 4,7 = 83 tienden - 47 tienden = 36 tienden = 3,6' },
      ],
    },
  ],
};

export const tafelsLesson: Lesson = {
  pages: [
    {
      title: 'Tafeltrucs',
      text: 'Met een paar trucs ken je een tafel sneller. Keer 10: zet een nul erachter. Keer 5: neem de helft van keer 10. Keer 2: dubbel.',
      examples: [
        { good: '10 x 7 = 70' },
        { good: '5 x 8 = de helft van 10 x 8 = de helft van 80 = 40' },
      ],
      tip: 'Bij een keer som mag je de getallen omdraaien. 3 x 7 is hetzelfde als 7 x 3.',
    },
    {
      title: 'Je kent een tafel nog niet? Splits!',
      text: 'Kun je een som niet meteen? Splits het getal in twee stukken die je wel kent. Reken die twee uit. Tel de antwoorden bij elkaar op.',
      examples: [
        { good: '7 x 8 = 7 x 4 + 7 x 4 = 28 + 28 = 56', why: '8 is 4 + 4.' },
        { good: '6 x 7 = 5 x 7 + 1 x 7 = 35 + 7 = 42', why: '6 is 5 + 1.' },
      ],
      tip: 'Kies stukken uit tafels die je goed kent, zoals 2, 5 en 10.',
    },
    {
      title: 'Tientallen keer een tafel',
      skill: 'tientallen-keer',
      text: 'Bij 30 x 7 reken je eerst 3 x 7. Dat is 21. Dat zijn 21 tientallen. Zet er dus een nul achter: 210.',
      examples: [
        { good: '30 x 7 = 3 x 7 x 10 = 21 x 10 = 210' },
        { good: '50 x 6 = 5 x 6 x 10 = 30 x 10 = 300' },
      ],
      tip: 'Reken de tafelsom en zet er een nul achter.',
    },
    {
      title: 'Twee cijfers keer één cijfer',
      skill: 'twee-cijfers-keer',
      text: 'Bij 34 x 6 splits je 34 in 30 en 4. Doe 30 x 6 en 4 x 6. Tel de twee antwoorden op.',
      examples: [
        { good: '34 x 6 = 30 x 6 + 4 x 6 = 180 + 24 = 204' },
      ],
      tip: 'Eerst de tientallen, dan de eenheden, dan optellen.',
    },
  ],
};

export const delenLesson: Lesson = {
  pages: [
    {
      title: 'Delen is omgekeerd keren',
      text: 'Delen en keer horen bij elkaar. Bij 56 : 7 vraag je jezelf: hoeveel keer 7 is 56? Het antwoord vind je in de tafel van 7.',
      examples: [
        { good: '56 : 7 = 8, want 8 x 7 = 56' },
        { good: '30 : 5 = 6, want 6 x 5 = 30' },
      ],
      tip: 'Kun je de deelsom niet? Zoek de keersom die erbij hoort.',
    },
    {
      title: 'Zoek in de tafel',
      text: 'Tel de tafel op met je vingers of in je hoofd. Ga zo ver tot je bij het getal komt. Het aantal stappen is je antwoord.',
      examples: [
        { good: '42 : 6 = ? 6, 12, 18, 24, 30, 36, 42. Dat zijn 7 stappen, dus 7.' },
      ],
      tip: 'Tel in sprongen van het getal waardoor je deelt.',
    },
    {
      title: 'Tientallen delen',
      skill: 'tientallen-delen',
      text: 'Bij 210 : 7 deel je eerst de tientallen. 210 is 21 tientallen. 21 : 7 = 3. Dus 3 tientallen: 30.',
      examples: [
        { good: '210 : 7 = 21 : 7 x 10 = 3 x 10 = 30' },
      ],
    },
    {
      title: 'Grote deelsommen in stukken',
      skill: 'drie-cijfers-delen',
      text: 'Is het getal groot? Knip het in twee stukken die je kunt delen. Deel elk stuk. Tel de antwoorden op.',
      examples: [
        { good: '392 : 7 = 350 : 7 + 42 : 7 = 50 + 6 = 56', why: '350 en 42 kun je allebei door 7 delen.' },
      ],
      tip: 'Controleer met keer: 56 x 7 = 392.',
    },
  ],
};
