import { ipcMain, app } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

// Define types for the analysis result
interface AnalysisResult {
  status: 'success' | 'error'
  original?: string
  vocals?: string
  accompaniment?: string
  lyrics?: string
  message?: string
}

export function registerAiHandlers() {
  ipcMain.handle('analyze-track', async (_, filePath: string): Promise<AnalysisResult> => {
    return new Promise((resolve, reject) => {
      // Determine path to python script
      // In development: python/audio_engine.py (relative to project root)
      // In production: resources/python/audio_engine.py (bundled)

      let pythonScriptPath: string
      // Try 'python3' first on non-Windows (or generally), falling back to 'python' if needed?
      // For simplicity, let's stick to 'python' if on Windows, 'python3' otherwise,
      // or just assume the user environment has one.
      // A better approach is to check which one exists or is configured.
      // But here we'll use a simple heuristic.
      let pythonExecutable = process.platform === 'win32' ? 'python' : 'python3'

      if (app.isPackaged) {
        // Path when packaged
        pythonScriptPath = path.join(process.resourcesPath, 'python', 'audio_engine.py')
      } else {
        // Path in development
        pythonScriptPath = path.join(process.cwd(), 'python', 'audio_engine.py')
      }

      // Determine output directory (app data folder)
      const outputDir = path.join(app.getPath('userData'), 'ai_cache')
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      console.log(`Running AI analysis on: ${filePath}`)
      console.log(`Script: ${pythonScriptPath}`)
      console.log(`Output Dir: ${outputDir}`)

      // Spawn Python process
      // We set MOCK_ML=true if we detect we are in an environment that might not have the deps
      // For now, let's rely on the python script to fail gracefully or the user to have set it up.
      // However, to ensure it works in this dev environment (which likely lacks spleeter),
      // I will force MOCK_ML=true if a specific env var is set, or just let it try.
      // Given the prompt "Node.js is not suitable... implement a Python sidecar",
      // I should assume the user handles the python env.
      // But for testing here, I might want to inject MOCK_ML if I can't install deps.

      const env = { ...process.env }
      // Check if we should force mock mode (e.g. for testing)
      // env['MOCK_ML'] = 'true'

      const pythonProcess = spawn(pythonExecutable, [
        pythonScriptPath,
        'analyze',
        filePath,
        '--output_dir', outputDir
      ], { env })

      let stdoutData = ''
      let stderrData = ''

      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString()
      })

      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString()
        console.error(`Python Stderr: ${data}`)
      })

      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`)

        if (code !== 0) {
          resolve({
            status: 'error',
            message: `Process failed with code ${code}. Stderr: ${stderrData}`
          })
          return
        }

        try {
          // Parse the JSON output from stdout
          // Note: stdout might contain other prints if not careful, but our script only prints JSON at the end
          // We should look for the last valid JSON block or just parse the whole thing if it's clean.
          // Our script prints only one JSON object.
          const result = JSON.parse(stdoutData.trim())
          resolve(result)
        } catch (e) {
          resolve({
            status: 'error',
            message: `Failed to parse Python output: ${e}. Stdout: ${stdoutData}`
          })
        }
      })

      pythonProcess.on('error', (err) => {
         resolve({
            status: 'error',
            message: `Failed to start Python process: ${err.message}`
          })
      })
    })
  })
}
