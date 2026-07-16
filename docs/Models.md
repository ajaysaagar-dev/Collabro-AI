import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})
 
async function main() {
  const completion = await openai.chat.completions.create({
    model: "poolside/laguna-xs-2.1",
    messages: [{"role":"user","content":""}],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 8192,
    
    stream: false
  })
   
  process.stdout.write(completion.choices[0]?.message?.content);
  
  
}

main();



import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})
 
async function main() {
  const completion = await openai.chat.completions.create({
    model: "z-ai/glm-5.2",
    messages: [{"role":"user","content":""}],
    temperature: 1,
    top_p: 1,
    max_tokens: 16384,
      seed: 42,
      
    stream: true
  })
   
  for await (const chunk of completion) {
        process.stdout.write(chunk.choices[0]?.delta?.content || '')
    
  }
  
}

main();

import axios from 'axios';


const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
const stream = false;

const headers = {
  "Authorization": "Bearer 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",
  "Accept": stream ? "text/event-stream" : "application/json"
};

async function main() {
  const payload = {"model":"minimaxai/minimax-m3","messages":[{"role":"user","content":""}],"temperature":1,"top_p":0.95,"max_tokens":8192,"stream":stream};

  const response = await axios.post(invokeUrl, payload, {
    headers: headers,
    responseType: stream ? 'stream' : 'json'
  });

  if (stream) {
    response.data.on('data', (chunk) => {
      console.log(chunk.toString());
    });
  } else {
    console.log(JSON.stringify(response.data));
  }
}

main().catch(error => {
  if (error.response) {
    console.error(`HTTP ${error.response.status}`);
    if (error.response.data?.on) {
      error.response.data.on('data', (chunk) => console.error(chunk.toString()));
    } else {
      console.error(error.response.data);
    }
  } else {
    console.error(error);
  }
});

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

 
async function main() {
  const completion = await openai.chat.completions.create({
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [{"role":"user","content":""}],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
    reasoning_budget: 16384,
    chat_template_kwargs: {"enable_thinking":true},
    stream: true
  })
   
  for await (const chunk of completion) {
        const reasoning = chunk.choices[0]?.delta?.reasoning_content;
    if (reasoning) process.stdout.write(reasoning);
        process.stdout.write(chunk.choices[0]?.delta?.content || '')
    
  }
  
}

main();


import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: "mistralai/mixtral-8x7b-instruct-v0.1",
    messages: [{"role":"user","content":""}],
    temperature: 0.5,
    top_p: 1,
    max_tokens: 1024,
    stream: false,
  })
   
  process.stdout.write(completion.choices[0]?.message?.content);
  
}

main();

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})
async function main() {
  const completionParams = {
    model: "meta/llama-3.1-8b-instruct",
    messages: [{"role":"user","content":""}],
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
    
  };

  

  const completion = await openai.chat.completions.create(completionParams);

  
  process.stdout.write(completion.choices[0]?.message?.content || '');
  
  
}

main();

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})
async function main() {
  const completionParams = {
    model: "meta/llama-3.1-70b-instruct",
    messages: [{"role":"user","content":""}],
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
    
  };

  

  const completion = await openai.chat.completions.create(completionParams);

  
  process.stdout.write(completion.choices[0]?.message?.content || '');
  
  
}

main();

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: "google/gemma-2-2b-it",
    messages: [{"role":"user","content":""}],
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
    stream: false,
  })
   
  process.stdout.write(completion.choices[0]?.message?.content);
  
}

main();

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})
 
async function main() {
  const completion = await openai.chat.completions.create({
    model: "meta/llama-3.2-1b-instruct",
    messages: [{"role":"user","content":""}],
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
    stream: false
  })
   
  process.stdout.write(completion.choices[0]?.message?.content);
  
}

main();

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})
 
async function main() {
  const completion = await openai.chat.completions.create({
    model: "meta/llama-3.2-3b-instruct",
    messages: [{"role":"user","content":""}],
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
    stream: false
  })
   
  process.stdout.write(completion.choices[0]?.message?.content);
  
}

main();

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})
 
async function main() {
  const completion = await openai.chat.completions.create({
    model: "meta/llama-3.3-70b-instruct",
    messages: [{"role":"user","content":""}],
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
    stream: false
  })
   
  process.stdout.write(completion.choices[0]?.message?.content);
  
}

main();

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})
 
async function main() {
  const completion = await openai.chat.completions.create({
    model: "microsoft/phi-4-mini-instruct",
    messages: [{"role":"user","content":""}],
    temperature: 0.1,
    top_p: 0.7,
    max_tokens: 1024,
    stream: false
  })
   
  process.stdout.write(completion.choices[0]?.message?.content);
  
}

main();