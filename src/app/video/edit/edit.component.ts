import {Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output} from '@angular/core';
import {ModalService} from "../../services/modal.service";
import IClip from "../../models/clip.model";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {ClipService} from "../../services/clip.service";

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.css']
})
export class EditComponent implements OnInit, OnDestroy, OnChanges {
  constructor(
    private modal: ModalService,
    private clipService: ClipService
  ) {
  }

  @Input() activeClip: IClip | null = null
  @Output() update = new EventEmitter()
  inSubmission = false
  showAlert = false
  alertColor = 'blue'
  alertMessage = 'Please wait! Updating clip'

  clipID = new FormControl('', {
    nonNullable: true
  })

  title = new FormControl('', {
    validators: [
      Validators.required,
      Validators.minLength(3)
    ],
    nonNullable: true
  })

  editForm = new FormGroup({
    title: this.title,
    id: this.clipID
  })

  ngOnInit() {
    this.modal.register('editClip')
  }

  ngOnDestroy() {
    this.modal.unregister('editClip')
  }

  ngOnChanges() {
    if(!this.activeClip) {
      return
    }

    if (this.activeClip.docID != null) {
      this.clipID.setValue(this.activeClip.docID)
    }
    this.inSubmission = false
    this.showAlert = false
    this.title.setValue(this.activeClip.title)
  }

  async submit() {
    if(!this.activeClip) {
      return
    }

    this.inSubmission = true
    this.showAlert = true
    this.alertColor = 'blue'
    this.alertMessage = 'Please wait! Updating clip'

    try {
      await this.clipService.updateClip(this.clipID.value, this.title.value)

    }
    catch (e) {
      this.inSubmission = false
      this.alertMessage = 'Something went wrong try again later'
      this.alertColor = 'red'
      return
    }

    this.inSubmission = false
    this.alertMessage = 'Success!'
    this.alertColor = 'green'

    this.activeClip.title = this.title.value
    this.update.emit(this.activeClip)
  }
}
