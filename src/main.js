const SETTINGS = {
    display: "grid", // "bars" | "grid"
    sample: "zone", // "point" | "zone"
    max_db: 0,
    min_db: -80,
};

const AudioContext = window.AudioContext || window.webkitAudioContext;

const audio_context = new AudioContext();

const analyzer = audio_context.createAnalyser();
// analyzer.smoothingTimeConstant = 0.8;
analyzer.fftSize = 8192;
// analyzer.fftSize = 4096;
// analyzer.fftSize = 2048;
// analyzer.fftSize = 1024;
// analyzer.maxDecibels = 0;
analyzer.maxDecibels = SETTINGS.max_db;
analyzer.minDecibels = SETTINGS.min_db;

function pianofreq(note) {
    return 2 ** ((note - 49) / 12) * 440;
}

const max_frequency = audio_context.sampleRate / 2;
// "linear from 0 to max_frequency"
const freq_bin_count = analyzer.frequencyBinCount;
const data_array = new Uint8Array(analyzer.frequencyBinCount);

const target_min_frequency = pianofreq(1);
const target_max_frequency = pianofreq(88);

console.log(target_min_frequency, target_max_frequency);

function sampleFreq(freq) {
    const freq_over_max = freq / max_frequency;
    const freq_i = freq_over_max * freq_bin_count;
    const freq_i_floor = Math.floor(freq_i);
    const freq_i_round = Math.floor(freq_i);
    const freq_i_ceil = Math.ceil(freq_i);
    if(SETTINGS.sample === "point") {
        return data_array[freq_i_round] / 255;
    }else{
        let result = 0;
        for(let i = freq_i_floor; i < freq_i_ceil; i += 1) {
            result += data_array[i];
        }
        return result / (freq_i_ceil - freq_i_floor) / 255;
    }
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 */
function render(ctx) {
    analyzer.getByteFrequencyData(data_array);
    const max_frequency = audio_context.sampleRate / 2;

    const data_len = Math.floor(data_array.length / 20);
    

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.scale(ctx.canvas.width, -ctx.canvas.height);
    ctx.translate(0, -1);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 1, 1);
    
    ctx.fillStyle = "white";
    // grid display
    if(SETTINGS.display === "grid") {
        for(let key = 1; key <= 12; key++) {
            for(let octave = 0; octave < 8; octave++){
                const value = sampleFreq(pianofreq( octave * 12 + key ));
                ctx.globalAlpha = value;
                const rw = 1 / 12;
                const rh = 1 / 8;
                const w = rw * value;
                const h = rh * value;
                ctx.fillRect((key - 1) / 12 + (rw / 2 - w / 2), octave / 8 + (rh / 2 - h / 2), w, h);
            }
        }
    }else{
        const max_notes = 88;
        for(let note = 1; note <= 88; note++) {
            const value = sampleFreq(pianofreq( note ));
            ctx.globalAlpha = value;
            ctx.fillRect((note - 1) / (max_notes - 1), 0, 1 / (max_notes - 1), value);
        }
    }
    ctx.globalAlpha = 1.0;

    ctx.restore();
    requestAnimationFrame(() => render(ctx));
}

function main() {
    const audio_element = document.getElementById("audioel");

    const source = audio_context.createMediaElementSource(audio_element);
    source.connect(analyzer);
    analyzer.connect(audio_context.destination);

    audio_element.onclick = () => {
        if (audio_context.state === "suspended") {
            audio_context.resume();
        }
    };

    /** @type {HTMLCanvasElement} */
    const canvas_el = document.getElementById("drawcanvas");
    const ctx = canvas_el.getContext("2d");

    render(ctx);
}

main();