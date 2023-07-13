import {Component, OnDestroy} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {AngularFireStorage, AngularFireUploadTask} from "@angular/fire/compat/storage";
import { v4 as uuid } from 'uuid'
import {last, switchMap} from "rxjs";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import firebase from "firebase/compat/app";
import {ClipService} from "../../services/clip.service";
import {Router} from "@angular/router";
import {FfmpegService} from "../../services/ffmpeg.service";

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnDestroy{
  isDragover = false
  file: File | null = null
  nextStep = false
  showAlert = false
  alertColor = 'blue'
  alertMessage = 'Please wait! Your clip is being uploaded!'
  inSubmission = false
  percentage = 0
  showPercentage = false
  user: firebase.User | null = null
  task?: AngularFireUploadTask
  screenshots: string[] = []
  selectedScreenshot = ''
  screenshotTask?: AngularFireUploadTask

  title = new FormControl('', {
    validators: [
      Validators.required,
      Validators.minLength(3)
    ],
    nonNullable: true
  })

  constructor(
    private storage: AngularFireStorage,
    private auth: AngularFireAuth,
    private clipsService: ClipService,
    private router: Router,
    public ffmpegService: FfmpegService
  ) {
    auth.user.subscribe(user => this.user = user)
    this.ffmpegService.init()
  }

  uploadFrom = new FormGroup({
    title: this.title
  })

  async storeFile($event: Event) {
    if(this.ffmpegService.isRunning) {
      return
    }

    this.isDragover = false
    this.file =  ($event as DragEvent).dataTransfer ?
      ($event as DragEvent).dataTransfer?.files.item(0) ?? null :
      ($event.target as HTMLInputElement).files?.item(0) ?? null

    if(!this.file || this.file.type !== 'video/mp4') {
      return
    }

    this.screenshots = await this.ffmpegService.getScreenshots(this.file)
    this.selectedScreenshot = this.screenshots[0]

    this.title.setValue(
      this.file.name.replace(/\.[^/.]+$/, '')
    )
    this.nextStep = true
  }

  async uploadFile() {
    this.uploadFrom.disable()
    this.showAlert = true
    this.alertColor = 'blue'
    this.alertMessage = 'Please wait! Your clip is being uploaded!'
    this.inSubmission = true
    this.showPercentage = true


    const clipFileName = uuid()
    const clipPath = `clips/${clipFileName}.mp4`

    const screenshotBlob = await this.ffmpegService.blobFromURL(this.selectedScreenshot)
    const screenshotPath = `screenshots/${clipFileName}.png`

    this.task = this.storage.upload(clipPath, this.file)
    const clipRef = this.storage.ref(clipPath)

    this.screenshotTask = this.storage.upload(screenshotPath, screenshotBlob)

    this.task.percentageChanges().subscribe(progress => {
        this.percentage = progress as number / 100
      }
    )
    this.task.snapshotChanges().pipe(
      last(),
      switchMap(()=> clipRef.getDownloadURL())
    ).subscribe({
      next: async (url) => {
        const clip = {
          uid: this.user?.uid as string,
          displayName: this.user?.displayName as string,
          title: this.title.value,
          fileName: `${clipFileName}.mp4`,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          url
        }

        const clipDocRef = await this.clipsService.createClip(clip)

        this.alertColor = 'green'
        this.alertMessage = 'Success! Your clip is now ready to share'
        this.showPercentage = false

        setTimeout(()=>{
          this.router.navigate([
            'clip', clipDocRef.id
          ])
        }, 1000)
      },
      error: (error) => {
        this.uploadFrom.enable()
        this.alertColor = 'red'
        this.alertMessage = 'Upload failed! Please try again later'
        this.inSubmission = true
        this.showPercentage = false
        console.error(error)
      }
    })
  }

  ngOnDestroy() {
    this.task?.cancel()
  }
}
